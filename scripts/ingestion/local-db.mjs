// Local stand-in for Supabase, no Docker: real Postgres (PGlite) in var/ingestion/local-db, built from supabase/migrations.
// It answers only the supabase-js calls ingest.mjs makes (select/order/range and upsert/select), not the dashboard.
// Usage: node scripts/ingestion/local-db.mjs seed | show | reset
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../', import.meta.url);
const dataDir = new URL('var/ingestion/local-db', root).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ident = name => { if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`bad identifier ${name}`); return name; };

export async function openLocalDb() {
  await mkdir(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  await pg.exec('create table if not exists _applied (name text primary key)');
  const done = new Set((await pg.query('select name from _applied')).rows.map(r => r.name));
  const dir = new URL('supabase/migrations/', root);
  for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    await pg.exec(await readFile(new URL(file, dir), 'utf8'));
    await pg.query('insert into _applied values ($1)', [file]);
  }
  return { pg, from: table => builder(pg, ident(table)) };
}

// One chainable, awaitable query: .select().order().range() or .upsert(rows, opts).select()
function builder(pg, table) {
  const q = { cols: '*', rows: null, opts: {}, order: null, range: null };
  const self = {
    select(cols = '*') { q.cols = cols.split(',').map(c => c.trim() === '*' ? '*' : ident(c.trim())).join(', '); return self; },
    order(col) { q.order = ident(col); return self; },
    range(from, to) { q.range = [from, to]; return self; },
    upsert(rows, opts = {}) { q.rows = rows; q.opts = opts; return self; },
    then(resolve, reject) { return run().then(resolve, reject); },
  };
  async function run() {
    try {
      if (!q.rows) {
        const [from, to] = q.range ?? [0, 99999];
        const sql = `select ${q.cols} from public.${table}${q.order ? ` order by ${q.order}` : ''} limit ${to - from + 1} offset ${from}`;
        return { data: (await pg.query(sql)).rows, error: null };
      }
      const cols = Object.keys(q.rows[0]).map(ident);
      const params = q.rows.flatMap(row => cols.map(c => row[c] ?? null));
      const values = q.rows.map((_, i) => `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(', ')})`).join(', ');
      const conflict = q.opts.ignoreDuplicates ? `on conflict (${ident(q.opts.onConflict)}) do nothing` : '';
      const sql = `insert into public.${table} (${cols.join(', ')}) values ${values} ${conflict} returning ${q.cols === '*' ? '*' : q.cols}`;
      return { data: (await pg.query(sql, params)).rows, error: null };
    } catch (e) { return { data: null, error: { message: e.message } }; }
  }
  return self;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === 'reset') { await rm(dataDir, { recursive: true, force: true }); console.log('Local database deleted.'); process.exit(0); }
  const db = await openLocalDb();
  if (command === 'seed') { // the 110 researched companies, as the shared database has them
    const { companies } = JSON.parse(await readFile(new URL('src/data/research/workday-companies.json', root), 'utf8'));
    const { data } = await db.from('companies').upsert(companies.map(({ id, name, domain, industry, headquarters, employee_count, workday_signal_date, source }) => ({ id, name, domain, industry, headquarters, employee_count, workday_signal_date, source })), { onConflict: 'id', ignoreDuplicates: true }).select('id');
    console.log(`Seeded ${data.length} companies.`);
  } else if (command === 'show') {
    for (const t of ['companies', 'scores', 'signals']) console.log(`${t}: ${(await db.pg.query(`select count(*)::int n from public.${t}`)).rows[0].n}`);
    console.table((await db.pg.query(`select c.name, s.total, s.tier, s.timing_score, s.assessed_at::date as assessed from public.scores s join public.companies c on c.id = s.company_id order by s.assessed_at desc limit 15`)).rows);
    console.table((await db.pg.query(`select c.name, g.signal_type, g.statement, g.quote from public.signals g join public.companies c on c.id = g.company_id order by g.created_at desc limit 15`)).rows);
  } else console.error('Usage: node scripts/ingestion/local-db.mjs seed | show | reset');
  await db.pg.close();
}
