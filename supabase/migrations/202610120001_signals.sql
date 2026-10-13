-- Evidence-backed claims extracted from collected sources. One row per claim; the quote is verbatim from the cited segment.
-- `fingerprint` is a hash of company, capture, segment and quote, so re-ingesting a batch adds nothing.
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fingerprint text not null unique,
  signal_type text not null check (signal_type in ('hiring', 'implementation', 'testing', 'other')),
  statement text not null,
  product_area text,
  date_kind text check (date_kind in ('published', 'event', 'removal')),
  date_raw text,
  date_normalized date,
  source_url text not null,
  capture_ref text not null,
  segment_id text not null,
  quote text not null,
  model text not null,
  created_at timestamptz not null default now()
);
create index signals_company_idx on public.signals(company_id);
alter table public.signals enable row level security;
