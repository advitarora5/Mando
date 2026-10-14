-- One shared row of outreach settings (voice, angles, Mando facts, templates, research notes) edited on the dashboard.
create table public.outreach_settings (
  id text primary key default 'default' check (id = 'default'),
  settings jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger outreach_settings_updated before update on public.outreach_settings for each row execute function public.touch_updated_at();
alter table public.outreach_settings enable row level security;
