// Runs the dashboard against the pipeline's local Supabase instead of production, so a pipeline run shows up in it.
// Usage: npm run dev:local   (after npx supabase start and npm run pipeline -- run --plan all)
// Process env beats .env.local in Next, so only this dev server is redirected; .env.local is not touched.
import { spawn } from "node:child_process";

const url = process.env.PIPELINE_SUPABASE_URL, key = process.env.PIPELINE_SUPABASE_KEY;
if (!url || !key) throw new Error("Set PIPELINE_SUPABASE_URL and PIPELINE_SUPABASE_KEY in .env.pipeline.local (see docs/ingestion-runbook.md).");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) throw new Error(`dev:local only points at a local database, not ${url}`);

const next = spawn("npx", ["next", "dev", "--hostname", "127.0.0.1"], { stdio: "inherit", shell: true, env: { ...process.env, SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } });
next.on("exit", code => process.exit(code ?? 0));
