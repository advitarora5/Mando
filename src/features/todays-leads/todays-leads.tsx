"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleHelp, Sparkles } from "lucide-react";
import { leadStatuses, leadStatusLabels, leadStatusOf, leadStatusText } from "@/domain/lead-status";
import { rankContacts } from "@/domain/contacts/contact-view";
import { bullets, formatDate } from "@/domain/text";
import { ContactDrafts } from "@/features/outreach/drafts";
import { TierChip } from "@/components/score";
import { Avatar, ChannelIcons } from "@/components/channels";
import { selectTodaysLeads } from "./select";
import type { TodaysLead } from "@/server/repositories/todays-leads";

type Status = (typeof leadStatuses)[number] | "all";
const options: Status[] = [...leadStatuses, "all"];

export function TodaysLeads({ leads, error }: { leads: TodaysLead[]; error?: string }) {
  // Without a stored lead status nothing is "queued", so start from all statuses instead of an empty list.
  const tracked = leads.some(lead => leadStatusOf(lead));
  const [status, setStatus] = useState<Status>(tracked ? "queued" : "all");
  const picked = selectTodaysLeads(leads, { limit: 10, status });
  const matching = leads.filter(lead => lead.score && (status === "all" || lead.lead_status === status)).length;
  return <div className="leads">
    <div className="leads-head">
      <div><h1>Today&apos;s leads</h1><p>Twice-weekly review: the highest-scoring leads to pick and send. Sending a draft marks the lead contacted.</p></div>
      <label className="range-group">Status<select className="select" value={status} onChange={e => setStatus(e.target.value as Status)}>
        {options.map(value => <option key={value} value={value}>{value === "all" ? "All statuses" : leadStatusLabels[value]}</option>)}
      </select></label>
    </div>
    {!tracked && <p className="active-filters" role="note" style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)", marginBottom: 12 }}><CircleHelp aria-hidden style={{ width: 14, height: 14 }} />Lead status is not stored in this database yet, so this shows all scored companies. Status filters work once the lead-status migration is applied.</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <p className="muted" role="status" style={{ marginBottom: 8 }}>Showing {picked.length} of {matching} leads (top 10)</p>
    {!picked.length ? <div className="card empty-state"><Sparkles aria-hidden /><strong>No leads match this status</strong><span>Try another status, or open the pipeline to review all companies.</span><Link className="btn" href="/">Open pipeline</Link></div>
      : <div className="lead-list">{picked.map(({ lead, rank }) => {
        const contact = rankContacts(lead.contacts)[0];
        const why = bullets(lead.why_now, 2);
        return <article key={lead.id} className="lead-card">
          <div className="lead-head">
            <span className="lead-rank">{rank ?? "—"}</span>
            <div className="lead-id"><Link href={`/companies/${lead.id}`}>{lead.name}</Link><small>{lead.industry ?? "Industry not recorded"}</small></div>
            <div className="lead-score"><TierChip score={lead.score} /><strong>{lead.score?.total ?? "—"}</strong></div>
          </div>
          <div className="lead-meta"><span>Status: {leadStatusText(lead)}</span><span>Contacted: {formatDate(lead.contacted_at) ?? "not yet"}</span></div>
          {why.items.length > 0 ? <ul className="bullets lead-why">{why.items.map(item => <li key={item}>{item}</li>)}</ul> : <p className="muted lead-why">No why-now rationale yet.</p>}
          {contact ? <section className="lead-contact">
            <div className="lead-contact-head"><div className="person"><Avatar name={contact.name} /><div className="person-text"><strong>{contact.name}</strong><small>{contact.title ?? "Title not recorded"}</small></div></div><ChannelIcons contact={contact} tipPosition="left" /></div>
            <ContactDrafts drafts={lead.drafts.filter(d => d.contact_id === contact.id)} companyId={lead.id} email={contact.email ?? null} linkedinUrl={contact.linkedin_url ?? null} />
          </section> : <p className="muted lead-why">No buyer contact yet. Add one on the company page.</p>}
        </article>;
      })}</div>}
  </div>;
}
