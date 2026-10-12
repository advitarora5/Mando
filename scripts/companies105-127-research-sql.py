"""Prepare guarded research-only SQL from reviewed dossiers and a fresh backup.

Usage: python scripts/companies105-127-research-sql.py BACKUP_JSON OUTPUT_DIR
Does not connect to Supabase, calculate scores, or change the database schema.
"""
import base64
import json
import sys
import uuid
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
before = json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
dossiers = [json.loads(p.read_text(encoding='utf8')) for p in sorted((repo/'src/data/research/companies105-127').glob('[0-9][0-9][0-9].json'))]
assert [d['number'] for d in dossiers] == list(range(105,128))
assert len({d['company_id'] for d in dossiers}) == 23
assert {d['company_id'] for d in dossiers} == {c['id'] for c in before['companies']}

def q(value):
    if value is None: return 'NULL'
    if isinstance(value, bool): return 'true' if value else 'false'
    if isinstance(value, int): return str(value)
    encoded = base64.b64encode(str(value).encode('utf8')).decode('ascii')
    return f"convert_from(decode('{encoded}','base64'),'UTF8')"

def jsonq(value): return q(json.dumps(value, ensure_ascii=False))+'::jsonb'
def normalized_name(value): return value.split(',')[0].strip().casefold()

companies, contacts, insights = [], [], []
for d in dossiers:
    assert d['research_status'] == 'reviewed' and d['modules'] and d['evidence']
    assert all(e['source'].startswith('https://') and e['reason'] for e in d['evidence'])
    old = next(c for c in before['companies'] if c['id'] == d['company_id'])
    c = {k:old[k] for k in ['id','name','domain','industry','headquarters','employee_count','workday_signal_date','source']}
    for key in ['domain','industry','employee_count','headquarters']:
        if key == 'headquarters' and 'needs confirmation' in d[key]: continue
        c[key] = d[key]
    c['source'] = d['company_source']
    if d['go_live'].get('clear_existing_signal_date'): c['workday_signal_date'] = None
    if d['go_live']['date']:
        assert d['go_live']['precision'] == 'day' and d['go_live']['status'] == 'completed'
        c['workday_signal_date'] = d['go_live']['date']
    companies.append(c)

    existing = [p for p in before['contacts'] if p['company_id'] == d['company_id']]
    contact_rows = [dict(p) for p in existing]
    for p in d['contacts']:
        match = next((x for x in contact_rows if normalized_name(x['name']) == normalized_name(p['name'])),None)
        if p['role_status'] not in ['current_official','current_public_profile']: continue
        if match is None:
            assert len(contact_rows) < 3
            match = dict(id=str(uuid.uuid5(uuid.NAMESPACE_URL,'mando:depth105-127:'+d['company_id']+':'+normalized_name(p['name']))),company_id=d['company_id'],name=p['name'],title=None,linkedin_url=None,source=None,mutual_connection=None,email=None,email_verified=False,email_source=None,phone=None,phone_source=None)
            contact_rows.append(match)
        match['title'] = p['title']
        match['source'] = p['source']
        if p.get('linkedin_url'): match['linkedin_url'] = p['linkedin_url']
        if p.get('email'):
            assert p.get('email_source') and not p.get('email_verified')
            match.update(email=p['email'],email_source=p['email_source'],email_verified=False)
        if p.get('phone'):
            assert p.get('phone_source')
            match.update(phone=p['phone'],phone_source=p['phone_source'])
    assert 1 <= len(contact_rows) <= 3
    columns = ['id','company_id','name','title','linkedin_url','source','mutual_connection','email','email_verified','email_source','phone','phone_source']
    contacts += [{k:p.get(k) for k in columns} for p in contact_rows]

    note = d['why_now']+'\n\nDEPTH RESEARCH — checked '+d['research_checked_on']+'; research only, scores unchanged.\n'
    note += 'Employee count: '+str(d['employee_count'])+'. '+d['employee_basis']+'\n'
    note += 'Industry: '+d['industry']+'; domain: '+d['domain']+'; headquarters: '+d['headquarters']+'.\n'
    note += 'Confirmed Workday modules: '+', '.join(d['modules'])+'.\n'
    note += 'Go-live evidence ('+d['go_live']['precision']+'): '+d['go_live']['description']+'\n'
    note += '\n'.join(url+' | Workday deployment timing source.' for url in d['go_live']['sources'])+'\n'
    note += '\n'.join(e['category']+': '+e['source']+' | '+e['reason'] for e in d['evidence'])+'\n'
    note += 'Contact research:\n'+'\n'.join(p['name']+' — '+p['title']+'; role verification: '+p['role_status']+'. '+p.get('notes','')+' Source: '+p['source'] for p in d['contacts'])+'\n'
    note += 'Information not available / needs confirmation: '+'; '.join(d['gaps'])+'\n'+d['research_notes']
    insights.append(dict(company_id=d['company_id'],persona_generated=d['persona'],level_generated=d['level'],why_now_generated=note))

ids = ','.join(q(d['company_id'])+'::uuid' for d in dossiers)
sql = "begin;\nset local lock_timeout='5s';\nset local statement_timeout='30s';\n"
sql += '-- Research only: no scores, tiers, snapshots, schema, or manual overrides are written.\n'
sql += 'do $guard$ begin\n'
sql += f'perform 1 from public.companies where id in ({ids}) order by id for update;\n'
sql += f'perform 1 from public.contacts where company_id in ({ids}) order by id for update;\n'
sql += f'perform 1 from public.company_insights where company_id in ({ids}) order by company_id for update;\n'
sql += f"if (select jsonb_agg(to_jsonb(c) order by c.id) from public.companies c where id in ({ids})) is distinct from {jsonq(before['companies'])} then raise exception 'Company changed since backup'; end if;\n"
sql += f"if (select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb) from public.contacts c where company_id in ({ids})) is distinct from {jsonq(before['contacts'])} then raise exception 'Contacts changed since backup'; end if;\n"
sql += f"if (select coalesce(jsonb_agg(to_jsonb(i) order by company_id),'[]'::jsonb) from public.company_insights i where company_id in ({ids})) is distinct from {jsonq(before['insights'])} then raise exception 'Insights changed since backup'; end if;\n"
for table,key in [('scores','scores_digest'),('weekly_snapshots','snapshots_digest')]:
    sql += f"if (select md5(coalesce(jsonb_agg(to_jsonb(s) order by id)::text,'')) from public.{table} s) <> {q(before[key])} then raise exception 'History changed since backup'; end if;\n"
sql += 'end $guard$;\n'
for c in companies:
    assignments = ','.join(k+'='+q(v)+('::date' if k=='workday_signal_date' else '') for k,v in c.items() if k not in ['id','name'])
    sql += f"update public.companies set {assignments} where id={q(c['id'])}::uuid;\n"
for p in contacts:
    keys = list(p)
    values = ','.join(q(p[k])+('::uuid' if k in ['id','company_id'] else '') for k in keys)
    updates = ','.join(k+'=excluded.'+k for k in keys if k not in ['id','company_id','name'])
    sql += f"insert into public.contacts ({','.join(keys)}) values ({values}) on conflict (id) do update set {updates};\n"
for i in insights:
    sql += 'insert into public.company_insights (company_id,persona_generated,level_generated,why_now_generated,generated_at) values ('+q(i['company_id'])+'::uuid,'+q(i['persona_generated'])+','+q(i['level_generated'])+','+q(i['why_now_generated'])+',now()) on conflict (company_id) do update set persona_generated=excluded.persona_generated,level_generated=excluded.level_generated,why_now_generated=excluded.why_now_generated,generated_at=now();\n'
sql += 'do $verify$ begin\n'
for table,key in [('scores','scores_digest'),('weekly_snapshots','snapshots_digest')]:
    sql += f"if (select md5(coalesce(jsonb_agg(to_jsonb(s) order by id)::text,'')) from public.{table} s) <> {q(before[key])} then raise exception 'Scoring/history unexpectedly changed; rolling back'; end if;\n"
sql += f"if (select count(*) from public.contacts where company_id in ({ids})) <> {len(contacts)} then raise exception 'Unexpected contact count'; end if;\n"
for old in before['insights']:
    for key in ['persona_override','level_override','why_now_override']:
        sql += f"if (select {key} from public.company_insights where company_id={q(old['company_id'])}::uuid) is distinct from {q(old[key])} then raise exception 'Manual override changed'; end if;\n"
sql += 'end $verify$;\n'
sql += f"select 'companies105-127-depth-20261012' as batch,23 as companies,{len(contacts)} as contacts,23 as research_notes,(select count(*) from public.scores) as scores_preserved,(select count(*) from public.weekly_snapshots) as snapshots_preserved;\n"
for mode,end in [('preview','rollback'),('apply','commit')]:
    (output/f'companies105-127-{mode}.sql').write_text(sql+end+';\n',encoding='utf8')
(output/'companies105-127-expected.json').write_text(json.dumps(dict(companies=companies,contacts=contacts,insights=insights),ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(dict(companies=23,contacts=len(contacts),new_contacts=len(contacts)-len(before['contacts']),published_buyer_emails=sum(bool(p['email']) for p in contacts),sql_characters=len(sql),scores_written=0)))
