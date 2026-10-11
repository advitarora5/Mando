-- One editable draft per contact and channel. `edited` protects hand edits from regeneration.
create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  channel text not null check (channel in ('email', 'linkedin')),
  subject text,
  body text not null,
  trigger text not null,
  edited boolean not null default false,
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (contact_id, channel)
);
create index outreach_drafts_company_idx on public.outreach_drafts(company_id);
create trigger outreach_drafts_updated before update on public.outreach_drafts for each row execute function public.touch_updated_at();
alter table public.outreach_drafts enable row level security;
