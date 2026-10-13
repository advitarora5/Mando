# Ingestion pipeline runbook

Finds companies that use Workday, captures public buying signals with a source link, date and exact quote,
scores them with the shared rubric and writes everything to Supabase. No human clicks during a run.

```
SEC names ──> Workday resolver ──┐
Workday career sites (jobs) ─────┼─> raw_captures ─> extract ─> signals ─> match ─> companies / review_queue ─> score ─> enrich (budget-gated) ─> score
treg r/workday (insight feed) ───┘   (append-only)  (structured + model)            (origin=pipeline)
```

## 1. Setup

```bash
npm ci
npx supabase start                    # local, isolated database (Docker). First start pulls images.
cp .env.example .env.pipeline.local   # then fill the PIPELINE_* values below (file is gitignored)
ollama pull qwen2.5:7b                # default local model
npm test && npm run test:integration
```

`.env.pipeline.local` for a local run:

| Variable | Meaning |
|---|---|
| `PIPELINE_SUPABASE_URL` / `PIPELINE_SUPABASE_KEY` | Target database. Local: `http://127.0.0.1:54321` and the `SECRET_KEY` from `npx supabase status`. **Deliberately not `SUPABASE_URL`**: that points at production in `.env.local`. |
| `PIPELINE_ALLOW_REMOTE` | Only for an approved non-local *test* project: its project ref. Any other remote URL is refused. |
| `PIPELINE_LLM` | `ollama` (default) \| `openai` \| `gemini` \| `none`. |
| `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_NUM_CTX` | Local model (default `qwen2.5:7b`, context 6144). |
| `PIPELINE_ALLOW_PAID_LLM`, `PIPELINE_LLM_BUDGET_USD`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | Paid models. Off unless `PIPELINE_ALLOW_PAID_LLM=1` **and** a budget > 0. Ask before enabling. |
| `TREG_TOKEN` | treg per-org agent token (CI). Locally, when empty, the signed-in `treg` CLI is used. |
| `TREG_BUDGET_USD` | Session cap for paid treg calls (default 0.50). `--max-spend` lowers it per run, never raises it. |
| `PIPELINE_CONTACT` | Contact address in every collector User-Agent. SEC answers 403 without one. |
| `PIPELINE_SEC_FILE` | Optional local copy of `company_tickers.json`, used only when `PIPELINE_CONTACT` is empty. |

Secrets live only in environment variables, `.env.pipeline.local` and GitHub secrets. Nothing prints them.

## 2. Run it

```bash
npm run pipeline -- run --plan weekly --limit 20            # discovery: SEC -> resolver -> extract -> match -> score
npm run pipeline -- run --plan daily --limit 20             # jobs -> extract (model) -> match -> score -> enrich
npm run pipeline -- run --plan all --limit 20 --max-spend 0.05
npm run pipeline -- run --plan collect --source workday-career-sites --limit 5
npm run pipeline -- run --plan extract | match | score | rescore | enrich
npm run pipeline -- run --plan weekly --dry-run             # in-memory: reads nothing from and writes nothing to the database
npm run pipeline -- import path/to/rows.csv                 # Import button rows
npm run pipeline -- health
npm run pipeline -- review list | approve <id> --domain x.com | merge <id> <company_id> | reject <id>
```

`--limit` is items per source (for the resolver: Workday sites to find; it tries up to six names per site).
`--no-llm` and `--no-treg` switch those off for one run.

## 3. Stages and rules

| Stage | What it does | Rules |
|---|---|---|
| Collect | `src/pipeline/collectors/*`, all `Collector.collect(source, limits, ctx) -> RawItem[]` | Plain HTTP/JSON, robots.txt checked, ≥1 s between requests to the same site, backoff on 429/503 (max 2 retries, Retry-After capped at 30 s). 401/403, CAPTCHA and "unavailable" pages (including 200 responses that are not the expected JSON) stop the source and are logged. |
| Raw store | `raw_captures` | Body exactly as received + SHA-256 fingerprint (volatile fields such as "Posted 3 Days Ago" excluded). Unchanged items are skipped and only refresh their signals' `last_seen_at`. Immutable (trigger). `pending_captures` is the work queue. |
| Extract | `src/pipeline/extract.ts` | Structured fields read directly (titles, dates, URLs, Workday tenant). The model reads only messy text into the fixed schema (`src/domain/ingestion/extraction-schema.ts`), temperature 0, JSON-schema constrained, retry once, then dead-letter. Quotes must be verbatim (else the signal is dropped); company, products, timing words, dates and project type must be supported by the text (else cleared and counted as hallucinations). Model down = captures stay queued. |
| Signals | `signals` | go_live, hiring, release_planning, known_customer, budget_clue, event; link, date, quote, confidence. Every type expires 14 days after last seen, except go-live (date bands). |
| Match | `src/domain/ingestion/matching.ts` | Exact website match merges. Similar name -> review (`similar_name`, with suggestion). New company + confirmed website + trusted signal (≥0.9) -> created with `origin = pipeline` (atomic SQL function). Else review (`no_website`, `untrusted_signal`, `over_run_cap`). Workday itself is excluded. Size never blocks ("size unknown" when missing). |
| Score | `src/domain/ingestion/pipeline-score.ts` on the shared `buildAssessment` / `evaluateTier` | Only companies in scope (`scoring_scope = pipeline_only` -> pipeline companies only; matched existing companies only receive signals). No evidence = "Assessment status: unknown. Needs evidence: ..." (shown as Not Enough Evidence, never a silent 0). A row is appended when numbers, tier or sources change, and at least every 14 days. |
| Enrich | `src/pipeline/enrich.ts` | Only companies with Budget + Release + Timing ≥ `ready_for_contacts_threshold` (25). Free people search first; then one verified work-email lookup per contact within the treg cap. Never pays for LinkedIn; "valid" only = verified; risky stored unverified; invalid not stored; never guesses; same contact + step never paid twice. No budget -> `enrichment_requests.status = skipped_budget`, Authority/Reachability stay "Needs evidence", the run continues. |

Scoring policy `pipeline-v1` (category weights, tiers and bands are the shared rubric's):
Authority = best contact's function 0-10 + seniority 0-8 + owns Workday 0-4, + coverage 0-3 (capped at 5 if function is unrelated).
Reachability = verified channel 0-9 + warm path 0-8 + conviction 0-8 (contact-level evidence only).
Budget = best signal of each kind: adjacent purchase 10 (6 if low confidence) + funded Workday project hiring 6 + other Workday hiring 3 + paying Workday customer 2, capped at 20.
Release = shared release calendar band only with a release-planning signal; a known customer without one = low neutral 3.
Timing = go-live date bands; hiring 10 (active project) / 8, decaying with posting age to 40% at 54+ days; event 5.

## 4. Read the run log and health

```sql
select job, source_id, trigger, status, counts, requests_made, llm_spend_usd, treg_spend_usd, error, started_at, finished_at
from pipeline_runs order by started_at desc limit 20;
select * from pipeline_health;   -- last run, new companies (7 days), review queue, dead letters, spend (7 days)
select * from source_alerts;     -- sources that failed or found nothing in each of their last 3 runs
select * from review_queue where status = 'pending' order by created_at desc;
```

`npm run pipeline -- health` prints the same. A run's `status`: `succeeded`, `partial` (some items failed), `blocked`
(source stopped: 403, CAPTCHA, rate limit or treg 402), `failed` (nothing worked). The runner also logs
`ALERT: source ... last 3 runs` lines. Spend: `var/spend-ledger.jsonl` (gitignored) and `paid_calls`.

## 5. Add a source

1. Add a row to `sources` (migration) with `type`, `frequency`, `max_requests_per_run`, `min_delay_ms`, `enabled`.
2. Implement `Collector` in `src/pipeline/collectors/` returning `RawItem`s exactly as received (put reading context in `meta.kind`).
   Use `PoliteHttp` for HTTP, or `paidTregCall` for treg (budget check + ledger + 402 handling).
3. Register it in `collectors` (`src/pipeline/collectors/sources.ts`) and add a reader for its `meta.kind` in `extractCapture`.
4. Record real responses into `tests/fixtures/ingestion/` (scrub secrets) and add contract tests: happy, empty,
   unavailable, CAPTCHA, 429, 403, malformed, timeout.
Stefan's raw-JSON input work plugs in here: a collector that returns his JSON as `RawItem`s needs no other changes.

## 6. Switch the model

`PIPELINE_LLM=ollama OLLAMA_MODEL=llama3.1:8b`, or a paid provider after approval:
`PIPELINE_LLM=openai PIPELINE_ALLOW_PAID_LLM=1 PIPELINE_LLM_BUDGET_USD=0.50 OPENAI_API_KEY=...`.
The prompt is versioned (`src/pipeline/prompts/extract-vN.md`, `PIPELINE_PROMPT_VERSION`). Compare on the golden set first:
`npm run pipeline:eval -- --model <model> --runs 5 --prompt extract-vN`. Another provider only needs a class implementing
`LLMProvider` (`src/pipeline/types.ts`).

## 7. Enable the schedule (after approval only)

The workflows in `.github/workflows/ingestion-{daily,weekly,rescore,import}.yml` ship with `workflow_dispatch` only.
To turn on a schedule: uncomment its `schedule:` block, set repository secrets `PIPELINE_SUPABASE_URL`,
`PIPELINE_SUPABASE_KEY`, `TREG_TOKEN` and variables `PIPELINE_ALLOW_REMOTE`, `PIPELINE_CONTACT`, `TREG_BUDGET_USD`
(default 0 = no paid calls), `PIPELINE_LLM` (hosted runners have no Ollama; default `none` = structured signals only).
Apply `supabase/migrations/202610130001_ingestion_pipeline.sql` to the target first (after a backup).
The Monday `weekly-snapshot.yml` is unchanged and still runs.

## 8. Verified Workday endpoint facts (2026-10-13)

- `POST https://{tenant}.{pod}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` with `{appliedFacets:{}, limit, offset, searchText}`.
  `limit` max 20 (21 -> HTTP 400). `total` is capped at 2000; offsets ≥ 2000 return the same page again. Wrong site -> HTTP 422.
  `searchText` is fuzzy (Target's "Analyst Payroll FinOps" matched "Workday" without containing it).
- `GET .../wday/cxs/{tenant}/{site}{externalPath}` -> `jobPostingInfo` (HTML `jobDescription`, `startDate`, `externalUrl`, `jobReqId`).
- `https://{tenant}.{pod}.myworkdayjobs.com/robots.txt` lists every site as `Sitemap: .../{site}/siteMap.xml` and allows `/wday/`.
  Unknown tenant -> HTTP 422; some private tenants -> 401.
- Name-to-tenant guessing finds about 1 in 4 public-company names (3 of 12 in a probe); abbreviations (WM, MMC) are missed.
