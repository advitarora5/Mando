"use client";

import { useState } from "react";
import Link from "next/link";
import { displayTier, tierSlug } from "@/domain/scoring/display";
import { safeUrl } from "@/domain/contracts/detail";
import { leadStatuses, leadStatusLabels } from "@/domain/lead-status";
import { ContactDrafts } from "@/features/outreach/drafts";
import { selectTodaysLeads } from "./select";
import type { TodaysLead } from "@/server/repositories/todays-leads";

type Status = (typeof leadStatuses)[number] | "all";
const options: Status[] = [...leadStatuses, "all"];

export function TodaysLeads({ leads, error }: { leads: TodaysLead[]; error?: string }) {
  const [status, setStatus] = useState<Status>("queued");
  const picked = selectTodaysLeads(leads, { limit: 10, status });
  const matching = leads.filter(lead => lead.score && (status === "all" || lead.lead_status === status)).length;
  return <main>
    <header><Link href="/">mando <span>/ prospect intelligence</span></Link><nav><Link href="/">← Company priorities</Link></nav></header>
    <section className="intro"><p className="eyebrow">TWICE-WEEKLY REVIEW</p><h1>Today&apos;s leads.</h1><p>Top-scored leads ready to pick and send. Sending a draft marks the lead contacted automatically.</p></section>
    {error && <p role="alert" className="error">{error}</p>}
    <section className="panel">
      <div className="panel-heading"><h2>Ready to reach out</h2><p>Highest-scoring leads first. Open a company to edit contacts, evidence, or insights.</p></div>
      <div className="list-controls">
        <label>Status<select value={status} onChange={e => setStatus(e.target.value as Status)}>
          {options.map(value => <option key={value} value={value}>{value === "all" ? "All statuses" : leadStatusLabels[value]}</option>)}
        </select></label>
      </div>
      <p className="result-count" role="status">Showing {picked.length} of {matching} leads (top 10)</p>
      {!picked.length
        ? <div className="empty"><p>No leads match this filter right now.</p></div>
        : picked.map(({ lead, rank }) => {
          const contact = [...lead.contacts].sort((a, b) => a.name.localeCompare(b.name))[0];
          const linkedin = safeUrl(contact?.linkedin_url ?? null);
          return <article key={lead.id} className="lead-card">
            <div className="lead-head">
              <span className="rank-cell">#{rank ?? "—"}</span>
              <div className="lead-id"><strong><Link className="company-link" href={`/companies/${lead.id}`}>{lead.name} ↗</Link></strong><small>{lead.industry ?? "Industry pending"}</small></div>
              <div className="lead-score"><strong>{lead.score?.total ?? "—"}</strong><span className={`tier-badge ${tierSlug(lead.score)}`}>{displayTier(lead.score)}</span></div>
            </div>
            <p className="lead-why"><span className="muted">Why now:</span> {lead.why_now ?? "Research pending"}</p>
            <dl className="facts">
              <div><dt>Status</dt><dd>{leadStatusLabels[lead.lead_status] ?? lead.lead_status}</dd></div>
              <div><dt>Contacted</dt><dd>{lead.contacted_at ? new Date(lead.contacted_at).toLocaleDateString("en-US", { timeZone: "America/Chicago" }) : "Not yet"}</dd></div>
            </dl>
            {contact
              ? <section className="lead-contact">
                <p><strong>{contact.name}</strong>{contact.title && <small>{contact.title}</small>}</p>
                <div className="reach">
                  {contact.email
                    ? <p><a className="source-link" href={`mailto:${contact.email}`}>{contact.email}</a> <span className={`verify ${contact.email_verified ? "yes" : "no"}`}>{contact.email_verified ? "Verified" : "Unverified"}</span></p>
                    : <p className="muted">No email recorded</p>}
                  {contact.phone && <p>{contact.phone}</p>}
                  {linkedin && <a className="source-link" href={linkedin} target="_blank" rel="noopener noreferrer">Profile ↗</a>}
                </div>
                <ContactDrafts drafts={lead.drafts.filter(d => d.contact_id === contact.id)} companyId={lead.id} email={contact.email ?? null} linkedinUrl={contact.linkedin_url ?? null} />
              </section>
              : <p className="muted">No buyer contact yet. Add one on the company page.</p>}
          </article>;
        })}
    </section>
    <footer>Drafts and one-click send come from the outreach pipeline. <Link href="/methodology">Company research and methodology</Link></footer>
  </main>;
}
