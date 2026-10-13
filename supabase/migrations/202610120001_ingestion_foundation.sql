-- Ingestion pipeline foundation. Adds tables only: companies, contacts and scores are not altered.
-- Flow: sources -> raw_captures -> extractions -> signals -> review_queue / companies -> scoring.

-- Pipeline settings, editable without a deploy. Values are JSON.
create table public.pipeline_settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  updated_at timestamptz not null default now(),
  check (key <> 'scoring_scope' or value in ('"pipeline_only"'::jsonb, '"all"'::jsonb)),
  check (key <> 'ready_for_contacts_threshold' or (jsonb_typeof(value) = 'number' and (value #>> '{}')::numeric between 0 and 50))
);

insert into public.pipeline_settings (key, value, description) values
  ('scoring_scope', '"pipeline_only"', 'pipeline_only: score only companies the pipeline created. all: score every company (switched by the depth group after their backfill).'),
  ('ready_for_contacts_threshold', '25', 'Budget + Release + Timing (out of 50) at or above which a company is ready for contact enrichment.'),
  ('signal_fresh_days', '14', 'Hiring and release-planning signals expire this many days after they were last seen.'),
  ('min_request_delay_ms', '1000', 'Minimum delay between requests to the same site.'),
  ('max_requests_per_run', '2000', 'Hard cap on HTTP requests in one pipeline run.'),
  ('max_llm_spend_usd_per_run', '1', 'Hard cap on language model spend in one pipeline run.'),
  ('max_new_companies_per_run', '50', 'Hard cap on companies the pipeline may create in one run.');

-- One row per source. Collectors read only enabled rows and stay within their caps.
create table public.sources (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  type text not null check (type in ('workday_career_site', 'workday_site_resolver', 'partner_client_list', 'greenhouse', 'lever')),
  name text not null,
  config jsonb not null default '{}',
  frequency text not null check (frequency in ('daily', 'weekly', 'biweekly', 'manual')),
  max_requests_per_run integer not null check (max_requests_per_run > 0),
  min_delay_ms integer not null default 1000 check (min_delay_ms >= 0),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.sources (id, type, name, frequency, max_requests_per_run, enabled) values
  ('workday-career-sites', 'workday_career_site', 'Workday career sites (myworkdayjobs.com)', 'daily', 1500, true),
  ('workday-site-resolver', 'workday_site_resolver', 'Company name to Workday career site resolver', 'weekly', 500, true),
  ('partner-client-lists', 'partner_client_list', 'Workday partner client lists and case studies', 'weekly', 200, false),
  ('greenhouse', 'greenhouse', 'Greenhouse job boards', 'weekly', 300, false),
  ('lever', 'lever', 'Lever job boards', 'weekly', 300, false);

-- Every scheduled, manual or Import-button run. Feeds alerts and the health panel.
create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  source_id text references public.sources(id),
  trigger text not null check (trigger in ('schedule', 'manual', 'import_button')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'blocked', 'failed')),
  requests_made integer not null default 0 check (requests_made >= 0),
  llm_spend_usd numeric not null default 0 check (llm_spend_usd >= 0),
  counts jsonb not null default '{}',
  error text,
  check (finished_at is null or finished_at >= started_at)
);

-- Results exactly as received. Never edited or deleted; captures without a successful extraction form the queue.
create table public.raw_captures (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.sources(id),
  run_id uuid references public.pipeline_runs(id),
  url text not null check (url ~ '^https?://'),
  fetched_at timestamptz not null default now(),
  http_status integer not null,
  content_type text,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  body text not null,
  unique (url, content_hash)
);

create function public.reject_raw_capture_change() returns trigger language plpgsql as $$
begin raise exception 'raw_captures rows are immutable'; end;
$$;
create trigger raw_captures_immutable before update or delete on public.raw_captures
  for each row execute function public.reject_raw_capture_change();

-- Structured parsing (no model) or a fixed-form model reading of one capture.
create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.raw_captures(id),
  run_id uuid references public.pipeline_runs(id),
  method text not null check (method in ('structured', 'llm')),
  model text not null default '',
  status text not null check (status in ('done', 'failed')),
  output jsonb,
  error text,
  cost_usd numeric not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now(),
  check (method = 'llm' or model = ''),
  check (status <> 'done' or output is not null),
  unique (capture_id, method, model)
);

-- Similar names, missing websites and untrusted signals wait here for approve, merge or reject.
create table public.review_queue (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null check (length(trim(candidate_name)) > 0),
  normalized_name text not null,
  candidate_domain text,
  employee_count integer check (employee_count >= 0),
  suggested_company_id uuid references public.companies(id) on delete set null,
  reason text not null check (reason in ('similar_name', 'no_website', 'untrusted_signal', 'over_run_cap')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'merged', 'rejected')),
  resolved_company_id uuid references public.companies(id) on delete set null,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'pending') = (decided_at is null)),
  check (status not in ('approved', 'merged') or resolved_company_id is not null)
);
create unique index review_queue_pending_name_idx on public.review_queue(normalized_name) where status = 'pending';

-- Public buying signals. Every row keeps its source link, date (when stated) and the exact quote.
-- Freshness: hiring and release_planning expire signal_fresh_days after last_seen_at; go_live uses the date bands.
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  review_item_id uuid references public.review_queue(id) on delete set null,
  capture_id uuid not null references public.raw_captures(id),
  extraction_id uuid references public.extractions(id),
  type text not null check (type in ('go_live', 'hiring', 'release_planning', 'known_customer', 'budget_clue', 'event')),
  signal_date date,
  source_url text not null check (source_url ~ '^https?://'),
  quote text not null check (length(trim(quote)) > 0),
  confidence numeric not null check (confidence between 0 and 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (last_seen_at >= first_seen_at)
);
create unique index signals_dedupe_idx on public.signals(type, source_url, md5(quote));
create index signals_company_idx on public.signals(company_id, last_seen_at desc);
create index signals_review_idx on public.signals(review_item_id) where review_item_id is not null;

-- Companies created by the pipeline. Absence means the company was added another way.
create table public.company_origins (
  company_id uuid primary key references public.companies(id) on delete cascade,
  origin text not null default 'pipeline' check (origin in ('pipeline')),
  run_id uuid references public.pipeline_runs(id),
  created_at timestamptz not null default now()
);

-- Ready for contact enrichment: latest assessment's Budget + Release + Timing meets the settings threshold.
create view public.company_contact_readiness with (security_invoker = true) as
select s.company_id,
  s.id as score_id,
  s.assessed_at,
  s.budget_score + s.release_score + s.timing_score as signal_points,
  (select (value #>> '{}')::numeric from public.pipeline_settings where key = 'ready_for_contacts_threshold') as threshold,
  s.budget_score + s.release_score + s.timing_score
    >= (select (value #>> '{}')::numeric from public.pipeline_settings where key = 'ready_for_contacts_threshold') as ready_for_contacts
from (select distinct on (company_id) * from public.scores where assessed_at <= now() order by company_id, assessed_at desc) s;

create trigger pipeline_settings_updated before update on public.pipeline_settings for each row execute function public.touch_updated_at();
create trigger sources_updated before update on public.sources for each row execute function public.touch_updated_at();

create index raw_captures_source_idx on public.raw_captures(source_id, fetched_at desc);
create index extractions_capture_idx on public.extractions(capture_id);
create index pipeline_runs_job_idx on public.pipeline_runs(job, started_at desc);

alter table public.pipeline_settings enable row level security;
alter table public.sources enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.raw_captures enable row level security;
alter table public.extractions enable row level security;
alter table public.review_queue enable row level security;
alter table public.signals enable row level security;
alter table public.company_origins enable row level security;
