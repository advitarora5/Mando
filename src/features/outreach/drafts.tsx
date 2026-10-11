"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gmailUrl, mailtoUrl, LINKEDIN_LIMIT } from "@/domain/outreach/draft";
import { safeUrl } from "@/domain/contracts/detail";
import { markDraftSent, saveDraft } from "./actions";
import type { StoredDraft } from "@/server/repositories/outreach-drafts";

type Props = { draft: StoredDraft; companyId: string; email: string | null; linkedinUrl: string | null };

function DraftCard({ draft, companyId, email, linkedinUrl }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isEmail = draft.channel === "email";
  const payload = { id: draft.id, company_id: companyId, subject, body };

  async function run(action: typeof saveDraft, done: string) {
    setBusy(true);
    const result = await action(payload);
    setBusy(false);
    setMessage(result.error ?? done);
    if (!result.error) router.refresh();
    return !result.error;
  }
  async function copy() {
    try { await navigator.clipboard.writeText(isEmail ? `Subject: ${subject}\n\n${body}` : body); setMessage("Copied."); }
    catch { setMessage("Copy failed. Select the text and copy it by hand."); }
  }
  // Open the destination first so the browser treats it as a direct click, then record the send.
  async function send(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    await run(markDraftSent, "Opened and marked contacted.");
  }
  async function sendLinkedIn() {
    await copy();
    const profile = safeUrl(linkedinUrl);
    if (profile) window.open(profile, "_blank", "noopener,noreferrer");
    await run(markDraftSent, "Message copied, profile opened, marked contacted.");
  }

  return <div className="draft">
    <div className="draft-head"><strong>{isEmail ? "Email" : "LinkedIn"}</strong><span className="muted">{draft.trigger}</span>{draft.sent_at && <span className="verify yes">Contacted {new Date(draft.sent_at).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}</span>}</div>
    {isEmail && <label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} maxLength={300} /></label>}
    <label>Message<textarea value={body} onChange={e => setBody(e.target.value)} rows={isEmail ? 7 : 4} maxLength={4000} /></label>
    {!isEmail && <small className={body.length > LINKEDIN_LIMIT ? "error-text" : "muted"}>{body.length}/{LINKEDIN_LIMIT} characters</small>}
    <div className="form-buttons">
      <button className="button secondary" disabled={busy} onClick={() => run(saveDraft, "Saved.")}>Save</button>
      <button className="button secondary" onClick={copy}>Copy</button>
      {isEmail ? (email
        ? <><button className="button" disabled={busy} onClick={() => send(gmailUrl(email, subject, body))}>Send in Gmail</button><button className="button secondary" disabled={busy} onClick={() => send(mailtoUrl(email, subject, body))}>Open in email app</button></>
        : <span className="muted">Add an email to send.</span>)
        : <button className="button" disabled={busy || !safeUrl(linkedinUrl)} onClick={sendLinkedIn}>Copy and open LinkedIn</button>}
    </div>
    {message && <p role="status" className="muted">{message}</p>}
  </div>;
}

export function ContactDrafts({ drafts, companyId, email, linkedinUrl }: { drafts: StoredDraft[]; companyId: string; email: string | null; linkedinUrl: string | null }) {
  if (!drafts.length) return <p className="muted">No drafted messages yet.</p>;
  const ordered = drafts.toSorted((a, b) => a.channel.localeCompare(b.channel));
  return <details className="drafts"><summary>Outreach drafts ({drafts.length})</summary>{ordered.map(d => <DraftCard key={d.id} draft={d} companyId={companyId} email={email} linkedinUrl={linkedinUrl} />)}</details>;
}
