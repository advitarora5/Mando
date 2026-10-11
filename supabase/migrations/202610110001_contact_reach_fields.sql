-- Contact reach details. Existing `source` stays the evidence link for the person's role and employer.
alter table public.contacts
  add column email text,
  add column email_verified boolean not null default false,
  add column email_source text,
  add column phone text,
  add column phone_source text;
