// Dedupes extracted claims against the companies table, records them as signals, and creates companies not yet known.
// Dry run by default; --apply writes. It never writes a score: scoring rules are undefined for now, so new companies stay unscored.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { openLocalDb } from './local-db.mjs';

const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const sha = value => createHash('sha256').update(value).digest('hex');
function stableId(value) {
  const hex = sha(value);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Pure planning step. Only claims about a named customer are kept; everything else is counted as skipped. */
export function planIngest(captures, extraction, existing) {
  const urls = new Map(captures.map(c => [c.capture_ref, c.url]));
  const byCompany = new Map();
  let skipped = 0;
  for (const result of extraction.results) {
    for (const claim of result.accepted) {
      const key = normalize(claim.company.name);
      if (claim.company.role !== 'customer' || !key) { skipped++; continue; }
      if (!byCompany.has(key)) byCompany.set(key, { name: claim.company.name.trim(), claims: [] });
      byCompany.get(key).claims.push({ claim, url: urls.get(claim.evidence.capture_ref) });
    }
  }
  const plan = [];
  for (const [key, { name, claims }] of byCompany) {
    const matches = existing.filter(row => normalize(row.name) === key);
    if (matches.length > 1) { plan.push({ name, action: 'ambiguous', claims }); continue; }
    const isNew = !matches.length;
    const id = isNew ? stableId(`mando-company:${key}`) : matches[0].id;
    plan.push({ name, id, action: isNew ? 'create' : 'existing', claims });
  }
  return { plan, skipped };
}

const signalRow = (companyId, { claim, url }, model) => ({
  company_id: companyId,
  fingerprint: sha(`${companyId}|${claim.evidence.capture_ref}|${claim.evidence.segment_id}|${claim.evidence.quote}`),
  signal_type: claim.signal_type, statement: claim.statement, product_area: claim.product_area,
  date_kind: claim.date?.kind ?? null, date_raw: claim.date?.raw ?? null, date_normalized: claim.date?.normalized ?? null,
  source_url: url, capture_ref: claim.evidence.capture_ref, segment_id: claim.evidence.segment_id, quote: claim.evidence.quote, model,
});

async function rows(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const files = args.filter(a => !a.startsWith('--'));
  const apply = args.includes('--apply');
  if (files.length !== 2) throw new Error('Usage: node --env-file=.env.local scripts/ingestion/ingest.mjs <captures.json> <claims.json> [--apply] [--local]');
  const batch = JSON.parse(await readFile(files[0], 'utf8'));
  const captures = batch.captures.map(c => ({ ...c, capture_ref: `${batch.brief.run_id}/${c.source_id}` }));
  const extraction = JSON.parse(await readFile(files[1], 'utf8'));
  // --local uses the Docker-free database from local-db.mjs, never the shared project.
  const db = args.includes('--local') ? await openLocalDb() : createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  const existing = [];
  for (let offset = 0; ; offset += 500) {
    const page = await rows(db.from('companies').select('id,name').order('id').range(offset, offset + 499));
    existing.push(...page);
    if (page.length < 500) break;
  }
  const { plan, skipped } = planIngest(captures, extraction, existing);
  console.table(plan.map(p => ({ company: p.name, action: p.action, claims: p.claims.length })));
  console.log(`${skipped} accepted claim(s) skipped: not a named customer.`);
  const bad = plan.filter(p => p.action === 'ambiguous');
  if (bad.length) { console.error(`${bad.length} company name(s) match more than one existing company. Nothing was saved.`); process.exit(1); }
  if (!apply) { console.log('DRY RUN: no database writes. Add --apply to save.'); process.exit(0); }

  const created = plan.filter(p => p.action === 'create');
  if (created.length) {
    await rows(db.from('companies').upsert(created.map(p => ({ id: p.id, name: p.name, source: p.claims[0].url })), { onConflict: 'id', ignoreDuplicates: true }).select('id'));
  }
  const signals = plan.flatMap(p => p.claims.map(c => signalRow(p.id, c, extraction.model)));
  const saved = signals.length ? await rows(db.from('signals').upsert(signals, { onConflict: 'fingerprint', ignoreDuplicates: true }).select('id')) : [];
  console.log(`Created ${created.length} companies, saved ${saved.length} new signals (${signals.length - saved.length} already saved).`);
  await db.pg?.close(); // local database only; keeps Node from hanging on it
}
