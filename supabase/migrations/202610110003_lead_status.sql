-- Lead status is company-grain: scores, ranks, snapshots and the Today's leads
-- view are all company-level. Per-contact sends stay on outreach_drafts.sent_at.
alter table public.companies
  add column lead_status text not null default 'queued'
    check (lead_status in ('queued', 'contacted', 'replied', 'demo_booked')),
  add column contacted_at timestamptz,
  add column replied_at timestamptz,
  add column demo_booked_at timestamptz;
create index companies_lead_status_idx on public.companies(lead_status);
-- RLS is already enabled on companies; no new policies (privileged server key only).
