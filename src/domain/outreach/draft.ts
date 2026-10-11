export const triggers = ["go-live", "job-posting", "release", "general"] as const;
export type Trigger = (typeof triggers)[number];
export type Channel = "email" | "linkedin";
export type Draft = { channel: Channel; subject: string | null; body: string };

export const LINKEDIN_LIMIT = 300;
export const EMAIL_WORD_LIMIT = 120;
// The 180-day go-live window is the research heuristic from the methodology page; tune with Adi.
export const GO_LIVE_WINDOW_DAYS = 180;

type Company = {
  name: string; industry: string | null; workday_signal_date: string | null; why_now: string | null;
  score: Record<string, string | number | null> | null;
};
type Contact = { name: string; title: string | null };

export function daysSince(date: string, now = Date.now()) {
  return Math.floor((now - Date.parse(date)) / 86400000);
}

// Which Mando angle fits the strongest stored signal, in priority order.
export function pickTrigger(c: Company, now = Date.now()): Trigger {
  if (c.workday_signal_date) {
    const days = daysSince(c.workday_signal_date, now);
    if (days >= 0 && days <= GO_LIVE_WINDOW_DAYS) return "go-live";
  }
  const timing = String(c.score?.timing_evidence ?? "");
  if (/\b(job|jobs|posting|postings|hiring|requisition)\b/i.test(timing)) return "job-posting";
  if (Number(c.score?.release_score ?? 0) > 0 && String(c.score?.release_evidence ?? "").trim()) return "release";
  return "general";
}

// The model sees only stored facts and the approved angle, so claims trace to the company page.
export function buildDraftPrompt(c: Company, contact: Contact, trigger: Trigger, angle: string, now = Date.now()): string {
  const days = c.workday_signal_date ? daysSince(c.workday_signal_date, now) : null;
  return `You draft short outreach for a sales rep at Mando to a buyer at a Workday customer. Use ONLY the facts below; never invent facts, results, customers or numbers. Do not claim anything about Mando beyond the angle given. Never compute dates yourself.
Contact: ${contact.name}, ${contact.title ?? "title unknown"}
Company: ${c.name} | industry: ${c.industry ?? "unknown"}
Workday go-live/signal: ${c.workday_signal_date ? `${c.workday_signal_date} (${days} days ago)` : "unknown"}
Why now: ${c.why_now ?? "not available"}
Trigger: ${trigger}
Mando angle for this trigger: ${angle}

Write two messages in a warm, plain, human voice. No hype, no flattery, no buzzwords, no emojis. One clear, low-pressure ask (a short intro call). Address the contact by first name.
- email: subject under 8 words, body under ${EMAIL_WORD_LIMIT} words, sign off as "Adi".
- linkedin: under ${LINKEDIN_LIMIT} characters total, no subject.
Reply with JSON only: {"email": {"subject": "...", "body": "..."}, "linkedin": {"body": "..."}}`;
}

export function parseDrafts(text: string): Draft[] {
  let json: { email?: { subject?: unknown; body?: unknown }; linkedin?: { body?: unknown } };
  try { json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { json = {}; }
  const ok = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
  const e = json.email, l = json.linkedin;
  if (!ok(e?.subject) || !ok(e?.body) || !ok(l?.body)) throw new Error(`Bad model output: ${text.slice(0, 200)}`);
  if (e.body.trim().split(/\s+/).length > EMAIL_WORD_LIMIT) throw new Error("Email draft is too long.");
  if (l.body.trim().length > LINKEDIN_LIMIT) throw new Error("LinkedIn draft is too long.");
  return [
    { channel: "email", subject: e.subject.trim(), body: e.body.trim() },
    { channel: "linkedin", subject: null, body: l.body.trim() },
  ];
}

// Free, no-account send options: the rep's own mail client or Gmail compose.
export function mailtoUrl(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function gmailUrl(to: string, subject: string, body: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
