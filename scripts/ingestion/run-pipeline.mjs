// Everything after collection in one command: validate -> extract -> ingest (+ score) -> insights.
// Collection is manual for now: run the browser agent (docs/ingestion/README.md), then pass its captures.json here.
// Dry run unless --apply. --local points ingest at the Docker-free database; without it ingest uses .env.local's Supabase.
// Usage: node --env-file=.env.local scripts/ingestion/run-pipeline.mjs <captures.json> [--apply] [--local] [--limit N]
//   --limit N extracts only the first N captures (use it for the first live runs).
// Every run keeps its files in var/ingestion/runs/<run>/ and appends one line to var/ingestion/pipeline.log.
import { spawnSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const input = args.find((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--limit');
if (!input) { console.error('Usage: run-pipeline.mjs <captures.json> [--apply] [--local] [--limit N]'); process.exit(1); }
const apply = args.includes('--apply');
const local = args.includes('--local');
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const here = path => fileURLToPath(new URL(path, import.meta.url));
const root = here('../../var/ingestion/');
const run = `pipeline-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const dir = `${root}runs/${run}/`;
const captures = `${dir}captures.json`, claims = `${dir}claims.json`;

const step = (name, script, scriptArgs) => {
  console.log(`\n== ${name}`);
  const result = spawnSync(process.execPath, ['--no-warnings', here(script), ...scriptArgs], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${name} failed (exit ${result.status})`);
};

await mkdir(dir, { recursive: true });
let status = 'ok', note = '';
try {
  const batch = JSON.parse(await readFile(input, 'utf8')); // a copy goes into the run folder, so the original is never edited
  await writeFile(captures, JSON.stringify(batch, null, 2));
  step('validate', './validate-capture.mjs', [captures]);
  if (Number.isFinite(limit)) { // trim to the first N captures for a small first run
    batch.captures = batch.captures.slice(0, limit);
    await writeFile(captures, JSON.stringify(batch, null, 2));
  }
  step('extract', './extract.mjs', [captures, claims]);
  step('ingest', './ingest.mjs', [captures, claims, ...(apply ? ['--apply'] : []), ...(local ? ['--local'] : [])]);
  // Insights read the live database only, so they run after a real apply, never for --local or a dry run.
  if (apply && !local) step('insights', '../generate-insights.mjs', []);
  note = apply ? 'applied' : 'dry run';
} catch (error) {
  status = 'failed'; note = error.message;
  process.exitCode = 1;
}
const line = `${new Date().toISOString()} ${status} ${run} ${note}${local ? ' (local db)' : ''}`;
await appendFile(`${root}pipeline.log`, line + '\n');
console.log(`\n${line}`);
