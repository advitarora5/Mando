"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gmailUrl, mailtoUrl, LINKEDIN_LIMIT } from "@/domain/outreach/draft";
import { safeUrl } from "@/domain/contracts/detail";
import { createDraft, deleteDraft, generateDrafts, markDraftSent, saveDraft } from "./actions";
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
  async function remove() {
    const warning = draft.sent_at ? "This draft was already sent. Deleting it also removes its contacted date. Delete it?" : "Delete this draft? You can generate or write a new one afterwards.";
    if (!window.confirm(warning)) return;
    setBusy(true);
    const result = await deleteDraft({ id: draft.id, company_id: companyId });
    setBusy(false);
    if (result.error) setMessage(result.error);
    else router.refresh();
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
      <button className="button secondary danger" disabled={busy} onClick={remove}>Delete</button>
      {isEmail ? (email
        ? <><button className="button" disabled={busy} onClick={() => send(gmailUrl(email, subject, body))}>Send in Gmail</button><button className="button secondary" disabled={busy} onClick={() => send(mailtoUrl(email, subject, body))}>Open in email app</button></>
        : <span className="muted">Add an email to send.</span>)
        : <button className="button" disabled={busy || !safeUrl(linkedinUrl)} onClick={sendLinkedIn}>Copy and open LinkedIn</button>}
    </div>
    {message && <p role="status" className="muted">{message}</p>}
  </div>;
}

export function ContactDrafts({ drafts, contactId, companyId, email, linkedinUrl }: { drafts: StoredDraft[]; contactId: string; companyId: string; email: string | null; linkedinUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const ordered = drafts.toSorted((a, b) => a.channel.localeCompare(b.channel));
  const missing = (["email", "linkedin"] as const).filter(channel => !drafts.some(d => d.channel === channel));

  async function create(channel: "email" | "linkedin") {
    setCreating(true); setError(null);
    const result = await createDraft({ contact_id: contactId, company_id: companyId, channel });
    setCreating(false);
    if (result.error) { setError(result.error); return; }
    setOpen(true);
    router.refresh();
  }

  async function generate() {
    setGenerating(true); setError(null);
    const result = await generateDrafts({ contact_id: contactId, company_id: companyId });
    setGenerating(false);
    if (result.error) { setError(result.error); return; }
    setOpen(true);
    router.refresh();
  }

  return <details className="drafts" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Outreach drafts ({drafts.length})</summary>
    <p className="muted"><Link href="/email-customization">Edit angles, voice and templates</Link></p>
    {!drafts.length && <p className="muted">No drafted messages yet.</p>}
    {ordered.map(d => <DraftCard key={d.id} draft={d} companyId={companyId} email={email} linkedinUrl={linkedinUrl} />)}
    {missing.length > 0 && <div className="form-buttons"><button className="button" disabled={generating || creating} onClick={generate}>{generating ? "Generating…" : "Generate with AI"}</button>{missing.map(channel => <button key={channel} className="button secondary" disabled={generating || creating} onClick={() => create(channel)}>{channel === "email" ? "Blank email" : "Blank LinkedIn message"}</button>)}</div>}
    {generating && <p role="status" className="muted">Writing drafts. This can take up to a minute.</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
  </details>;
}
