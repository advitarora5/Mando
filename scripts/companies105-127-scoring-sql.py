"""Generate guarded append-only SQL from a fresh private backup and reviewed assessments.

Usage: python scripts/companies105-127-scoring-sql.py backup.json assessments.json output-prefix
The backup must include companies, contacts, insights, scores, global_counts,
scores_digest and snapshots_digest. Keep backups and generated SQL outside Git.
Preview rolls back; apply commits. This script never connects to the database.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def sql(value):
    if value is None:
        return 'null'
    if isinstance(value, (int, float)):
        return str(value)
    encoded = base64.b64encode(value.encode('utf8')).decode('ascii')
    return "convert_from(decode('" + encoded + "','base64'),'UTF8')"


def build(before, scored):
    entries = scored['companies']
    rows = [entry['row'] for entry in entries]
    companies = {c['id']: c for c in before['companies']}
    insights = {i['company_id']: i for i in before['insights']}
    assert len(rows) == 23 and len({r['id'] for r in rows}) == 23
    assert {r['company_id'] for r in rows} == set(companies) == set(insights)
    assert all(e['display_tier'] in ['Not Enough Evidence', 'Maybe', 'Qualified', 'Disqualified'] for e in entries)
    assert all(r['tier'] in ['Qualified', 'Maybe', 'Disqualified'] for r in rows)  # PR17 supplies incomplete display label.
    ids = ','.join(literal(r['id']) + '::uuid' for r in rows)
    cids = ','.join(literal(cid) + '::uuid' for cid in companies)
    cols = ['id', 'company_id', 'assessed_at', 'rubric_version', 'tier'] + [c + s for c in ['authority', 'reachability', 'budget', 'release', 'timing'] for s in ['_score', '_evidence']]
    text = "begin;\nset local lock_timeout='5s';\nset local statement_timeout='30s';\nlock table public.scores in share row exclusive mode;\n"
    text += 'do $guard$ begin\n'
    text += f"if (select md5(coalesce(jsonb_agg(to_jsonb(s) order by id)::text,'')) from public.scores s where id not in ({ids})) is distinct from {literal(before['scores_digest'])} then raise exception 'Existing scores changed since backup'; end if;\n"
    text += f"if (select md5(coalesce(jsonb_agg(to_jsonb(s) order by id)::text,'')) from public.weekly_snapshots s) is distinct from {literal(before['snapshots_digest'])} then raise exception 'Weekly history changed since backup'; end if;\n"
    contacts = json.dumps(before['contacts'], ensure_ascii=False)
    text += f"if (select coalesce(jsonb_agg(to_jsonb(c) order by id),'[]'::jsonb) from public.contacts c where company_id in ({cids})) is distinct from {sql(contacts)}::jsonb then raise exception 'Contacts changed since backup'; end if;\n"
    patches = []
    for entry in entries:
        row = entry['row']; cid = row['company_id']; company = companies[cid]; insight = insights[cid]
        historical = [s for s in before['scores'] if s['company_id'] == cid]
        assert historical and max(s['assessed_at'] for s in historical) < row['assessed_at']
        latest = max(historical, key=lambda s: (s['assessed_at'], s['id']))
        reach_note = 'Reachability uses the user-authorized general public-route interpretation; no team/Adi mutual is required. Historical systems initiative is an action proxy, not confirmed intent to buy Mando.' if scored['policy'] == 'consultant-public-route-v1' else 'Public profiles do not establish a team/Adi connection or willingness.'
        note = f"Latest qualification review {scored['assessed_at']} (assessment {row['id']}): {entry['display_tier']}. Evidence-backed total {entry['total']}/100; Authority {row['authority_score']}/25, Reachability {row['reachability_score']}/25, Budget {row['budget_score']}/20, Release {row['release_score']}/15, Timing {row['timing_score']}/15. Unresolved: {', '.join(entry['unresolved_categories']) or 'none'}. Zero unknown scores are provisional, not verified failures. {reach_note} Budget proxy credit is partial and does not establish a present purchase window. Release date is shared and estimated. This review supersedes older qualification notes. Full category evidence is saved in this assessment; incomplete dashboard badge requires PR17 deployment."
        why = (insight['why_now_generated'] or '') + '\n\n' + note
        patches.append({'company_id': cid, 'why_now_generated': why})
        text += f"perform 1 from public.companies where id={literal(cid)}::uuid for update;\n"
        text += f"if (select updated_at from public.companies where id={literal(cid)}::uuid) is distinct from {literal(company['updated_at'])}::timestamptz then raise exception 'Company changed: {cid}'; end if;\n"
        text += f"if (select id from public.scores where company_id={literal(cid)}::uuid order by assessed_at desc,id desc limit 1) not in ({literal(latest['id'])}::uuid,{literal(row['id'])}::uuid) then raise exception 'Assessment changed: {cid}'; end if;\n"
        text += f"perform 1 from public.company_insights where company_id={literal(cid)}::uuid for update;\n"
        old_hash = hashlib.md5(insight['why_now_generated'].encode('utf8')).hexdigest() if insight['why_now_generated'] is not None else None
        new_hash = hashlib.md5(why.encode('utf8')).hexdigest()
        text += f"if not exists(select 1 from public.company_insights where company_id={literal(cid)}::uuid and (md5(why_now_generated) is not distinct from {sql(old_hash)} or md5(why_now_generated) is not distinct from {sql(new_hash)})) then raise exception 'Insight changed: {cid}'; end if;\n"
        for field in ['persona_override', 'level_override', 'why_now_override']:
            # Actual column names are checked from the supplied backup, not silently ignored.
            actual = field if field in insight else field.replace('_override', '_manual')
            assert actual in insight, f'Missing override column {actual}'
            text += f"if (select {actual} from public.company_insights where company_id={literal(cid)}::uuid) is distinct from {sql(insight[actual])} then raise exception 'Manual insight changed: {cid}'; end if;\n"
    text += 'end $guard$;\n'
    values = []
    for row in rows:
        assert all(row[c + '_evidence'].startswith('https://') and 'Assessment status:' in row[c + '_evidence'] for c in ['authority', 'reachability', 'budget', 'release', 'timing'])
        values.append('(' + ','.join(sql(row[k]) + ('::uuid' if k in ['id', 'company_id'] else '::timestamptz' if k == 'assessed_at' else '') for k in cols) + ')')
    text += 'insert into public.scores(' + ','.join(cols) + ') values\n' + ',\n'.join(values) + '\non conflict(id) do nothing;\n'
    for patch in patches:
        new_hash = hashlib.md5(patch['why_now_generated'].encode('utf8')).hexdigest()
        text += f"update public.company_insights set why_now_generated={sql(patch['why_now_generated'])},generated_at=now() where company_id={literal(patch['company_id'])}::uuid and md5(why_now_generated) is distinct from {sql(new_hash)};\n"
    text += f"do $verify$ begin if (select count(*) from public.scores where id in ({ids}))<>23 then raise exception 'Expected 23 assessments'; end if; end $verify$;\n"
    text += f"select 'companies105-127-scoring-20261012' as batch,count(*) as saved_assessments,min(total) as lowest_total,max(total) as highest_total,count(*) filter(where authority_score=25) as authority_verified,count(*) filter(where budget_score=10) as partial_budget_proxies,count(*) filter(where tier='Maybe') as maybe_count,'Incomplete badge awaits PR17 deployment' as status from public.scores where id in ({ids});\n"
    return text, {'scores': rows, 'insights': patches}


if __name__ == '__main__':
    backup, assessments, prefix = sys.argv[1:]
    text, expected = build(json.loads(Path(backup).read_text(encoding='utf8')), json.loads(Path(assessments).read_text(encoding='utf8')))
    for mode, end in [('preview', 'rollback'), ('apply', 'commit')]:
        Path(prefix + '-' + mode + '.sql').write_text(text + end + ';\n', encoding='utf8')
    Path(prefix + '-expected.json').write_text(json.dumps(expected, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'assessments': 23, 'sql_chars': len(text), 'preview': prefix + '-preview.sql', 'apply': prefix + '-apply.sql'}))
