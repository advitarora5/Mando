"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, Inbox, Search, Settings, SquareArrowOutUpRight } from "lucide-react";
import type { CompanyListItem, LeadStatus } from "@/domain/contracts/company";
import { contactFunction, emailLabel, emailState, functionLabel, rankContacts } from "@/domain/contacts/contact-view";
import { leadStatusOf, leadStatusText } from "@/domain/lead-status";
import { tierKey } from "@/domain/scoring/view";
import { TierChip } from "@/components/score";
import { Avatar, ChannelIcons } from "@/components/channels";
import { TabBar } from "@/components/tabs";
import { isReady } from "@/features/pipeline/state";

type Filter = "ready" | LeadStatus | "all";
const filters: { id: Filter; label: string }[] = [
  { id: "ready", label: "Ready to contact" }, { id: "queued", label: "Queued" }, { id: "contacted", label: "Contacted" },
  { id: "replied", label: "Replied" }, { id: "demo_booked", label: "Demo booked" }, { id: "all", label: "All contacts" },
];
const statusChip: Record<LeadStatus, string> = { queued: "neutral", contacted: "info", replied: "warn", demo_booked: "ok" };

type Row = { company: CompanyListItem; contact: CompanyListItem["contacts"][number]; top: boolean };
function match(r: Row, f: Filter) {
  if (f === "all") return true;
  if (f === "ready") return isReady(r.company) && emailState(r.contact) === "verified";
  return leadStatusOf(r.company) === f;
}

export function OutreachQueue({ companies }: { companies: CompanyListItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ready");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => companies
    .filter(c => c.contacts.length)
    .toSorted((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1) || a.name.localeCompare(b.name))
    .flatMap(c => rankContacts(c.contacts).map((contact, i) => ({ company: c, contact, top: i === 0 }))), [companies]);
  const counts = useMemo(() => Object.fromEntries(filters.map(f => [f.id, rows.filter(r => match(r, f.id)).length])), [rows]);
  const tracked = companies.some(c => leadStatusOf(c));
  const q = query.trim().toLowerCase();
  const visible = rows.filter(r => match(r, filter) && (!q || `${r.contact.name} ${r.contact.title ?? ""} ${r.company.name}`.toLowerCase().includes(q)));

  return <>
    <div className="toolbar queue-head">
      <div className="queue-intro">
        <h1>Outreach queue</h1>
        <p className="muted">Contacts at scored companies, best first. Open a record to send a draft or update its status.</p>
      </div>
      <div className="queue-actions">
        <label className="field queue-search"><Search aria-hidden /><span className="sr-only">Search contacts</span><input className="input search" type="search" placeholder="Search contact or company" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <Link className="btn" href="/email-customization" title="Edit angles, voice and templates for drafted messages"><Settings aria-hidden />Email customization</Link>
      </div>
      <div className="record-tabs queue-tabs"><TabBar idPrefix="queue" value={filter} onChange={setFilter} items={filters.map(f => ({ ...f, count: counts[f.id] }))} /></div>
    </div>
    {!tracked && <p className="active-filters note-banner" role="note"><CircleHelp aria-hidden />Lead status isn&apos;t stored in this database yet, so every company counts as not contacted. The status tabs fill once the lead-status migration is applied.</p>}
    <div className="table-wrap" id="queue-panel" role="tabpanel" aria-labelledby={`queue-${filter}`}>
      <table className="dt" aria-label="Outreach queue">
        <thead><tr>
          <th className="sticky-1" style={{ left: 0 }}>Contact</th><th>Company</th><th>Tier</th><th className="num">Total</th><th>Channels</th><th>Email</th><th>Lead status</th><th><span className="sr-only">Open</span></th>
        </tr></thead>
        <tbody>{visible.map(({ company: c, contact, top }) => {
          const state = emailState(contact);
          return <tr key={contact.id} onClick={() => router.push(`/companies/${c.id}#outreach`)}>
            <td className="sticky-1" style={{ left: 0 }}><div className="person queue-person"><Avatar name={contact.name} /><div className="person-text"><strong title={contact.name}>{contact.name}</strong><small title={contact.title ?? undefined}>{contact.title ?? "Title not recorded"}</small></div>
              <span className="role-tag" style={{ marginLeft: "auto" }}>{top ? "Top · " : ""}{functionLabel[contactFunction(contact.title)]}</span></div></td>
            <td><Link href={`/companies/${c.id}`} onClick={e => e.stopPropagation()} className="cell-truncate" style={{ maxWidth: 240, color: "var(--text)" }} title={c.name}>{c.name}</Link></td>
            <td><TierChip tier={tierKey(c.score)} /></td>
            <td className="num"><span className="cell-total" style={{ fontSize: "var(--fs-md)" }}>{c.score?.total ?? "—"}</span></td>
            <td><ChannelIcons contact={contact} /></td>
            <td><span className={`chip ${state === "verified" ? "ok" : state === "invalid" ? "err" : state === "none" || state === "not_found" ? "neutral" : "warn"}`}>{emailLabel(contact)}</span></td>
            <td>{leadStatusOf(c) ? <span className={`chip ${statusChip[leadStatusOf(c)!]}`}>{leadStatusText(c)}</span> : <span className="empty-cell">Not tracked</span>}</td>
            <td onClick={e => e.stopPropagation()}><Link className="btn btn-ghost btn-icon" href={`/companies/${c.id}#outreach`} aria-label={`Open outreach for ${c.name}`} data-tip="Open outreach" data-tip-pos="left"><SquareArrowOutUpRight aria-hidden /></Link></td>
          </tr>;
        })}</tbody>
      </table>
      {!visible.length && <div className="empty-state"><Inbox aria-hidden />
        <strong>{filter === "ready" ? "Nobody is ready to contact yet" : "No contacts in this view"}</strong>
        <span>{filter === "ready" ? "A contact is ready when their company is Qualified or Maybe, still queued, and the contact has a verified email." : "Try another status or clear the search."}</span>
        {filter === "ready" && <button type="button" className="btn" onClick={() => setFilter("all")}>Show all contacts</button>}
      </div>}
    </div>
  </>;
}
