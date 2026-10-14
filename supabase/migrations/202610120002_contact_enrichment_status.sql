-- Contact enrichment status. Additive and nullable only: existing columns and values are untouched.
-- email_verified stays the dashboard's "Verified" flag; it is set only for a provider verdict of valid.
-- email_source / phone_source stay human evidence links; provider provenance goes in contact_sources.
alter table public.contacts
  add column if not exists email_status text check (email_status in ('valid', 'risky', 'invalid', 'not_found')),
  add column if not exists phone_status text check (phone_status in ('live', 'dead', 'unknown', 'not_found')),
  add column if not exists linkedin_status text check (linkedin_status in ('provided', 'confirmed', 'unconfirmed', 'not_found')),
  add column if not exists contact_sources jsonb,
  add column if not exists enriched_at timestamptz;
