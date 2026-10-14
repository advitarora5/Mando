import { z } from "zod";

// Defined here (not in draft.ts) so this file has no value import from it: scripts run both directly under Node.
export const triggers = ["go-live", "job-posting", "release", "general"] as const;
export type Trigger = (typeof triggers)[number];

// Everything the outreach page can edit. Stored as one JSON row, so older rows missing newer fields still load.
export const settingsSchema = z.object({
  mando_facts: z.string().trim().max(8000),
  hooks: z.string().trim().max(4000),
  angle_go_live: z.string().trim().max(2000),
  angle_job_posting: z.string().trim().max(2000),
  angle_release: z.string().trim().max(2000),
  angle_general: z.string().trim().max(2000),
  voice: z.string().trim().max(2000),
  ask: z.string().trim().max(1000),
  avoid: z.string().trim().max(4000),
  example: z.string().trim().max(4000),
  sign_off: z.string().trim().min(1, "Sign-off cannot be empty.").max(200),
  email_template: z.string().trim().max(4000),
  linkedin_template: z.string().max(1000),
  email_max_words: z.number().int().min(20, "Email word limit must be at least 20.").max(500, "Email word limit must be 500 or fewer."),
  subject_max_words: z.number().int().min(2, "Subject word limit must be at least 2.").max(20, "Subject word limit must be 20 or fewer."),
  go_live_window_days: z.number().int().min(1, "Go-live window must be at least 1 day.").max(3650, "Go-live window must be 3650 days or fewer."),
  research_notes: z.string().trim().max(30000),
});
export type OutreachSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: OutreachSettings = {
  mando_facts: `Mando is an AI "intelligence layer" for application owners. It documents, troubleshoots and tests enterprise application workflows so support teams spend less time on tickets. It works in the browser, with no API connectors, middleware or IT project.
Workday support: a customer opens a ticket from their own tenant by speaking and sharing their screen, and Mando captures the screenshots, URLs and tenant details. A senior expert handles it, not a junior generalist, and each customer gets a dedicated team member. Every resolution comes with step-by-step documentation of what went wrong, why, and how it was fixed. There is no minimum commitment, and billing is tied to documented deliverables. Capacity can flex with workload, for example during Open Enrollment, without change orders.
Testing: test cases are captured from real user workflows, so nobody writes or maintains scripts. The full workflow library can be replayed against a Workday preview tenant to produce an impact assessment ahead of a release. Runs can be scheduled, and failures come with screenshots of the step where the workflow diverged.
Documentation: Mando records changes made inside the application, generates SOPs, flags drift from a gold-standard configuration, and maps downstream dependencies before a change.
Security: Mando is SOC 2 Type II certified, masks PII automatically, stores data on U.S. servers, and does not use customer data to train models for other customers.`,
  hooks: `The first releases after a go-live are usually the busy ones for a Workday team.
Every customized workflow has to be rechecked when a Workday release lands.
Knowledge about how the tenant is configured often sits with one or two people.
Support requests pile up when the admin team is small or growing.`,
  angle_go_live: "Recently live on Workday. Mando offers expert Workday support from a dedicated team, and documents every change and fix as it happens.",
  angle_job_posting: "Hiring for Workday roles, so the team is growing or covering a gap. Mando offers senior-expert support and automatic documentation, so new hires are not relearning the tenant from scratch.",
  angle_release: "Preparing for an upcoming Workday release. Mando's testing replays the team's real workflows against the Workday preview tenant so they can see the impact before it reaches production.",
  angle_general: "Existing Workday customer with no specific trigger identified. Mando offers Workday support with expert help and documentation, and no long-term commitment.",
  voice: `Warm, plain and human. No hype, no flattery, no buzzwords, no emojis, no em dashes.
Address the contact by first name.`,
  ask: "One clear, low-pressure ask: a short intro call.",
  avoid: `Opening with "I hope this finds you well"
Questions in the subject line
Exclamation marks
Claiming results, customers or numbers that are not in the facts provided`,
  example: `Subject: Your Workday rollout

Hi Sam,

Saw that your team went live on Workday a few weeks ago. The first releases after a go-live tend to be the busy ones for HRIS teams.

Mando gives Workday teams expert support from a dedicated person, and documents every fix as it happens. Would you be open to a 15-minute call next week?

Best,
Adi`,
  sign_off: "Adi",
  email_template: `Hi {first_name},



Best,
{sign_off}`,
  linkedin_template: "Hi {first_name}, ",
  email_max_words: 120,
  subject_max_words: 8,
  go_live_window_days: 180,
  research_notes: `MANDO RESEARCH (from mando.work, read 2026-10-13). This is what Mando says about itself. It is not independent and has not been checked against a sales deck. Confirm wording with Adi before relying on it in outreach.

WHAT MANDO IS
Homepage tagline: "The intelligence layer for application owners." Promise: "Documentation that writes itself. Training that builds itself. Tests that run themselves." Platform pages: Research, Documentation, Training, Audit, Testing.
Supports Workday, ServiceNow, Salesforce, QuickBooks, Coupa, NetSuite, ADP and SAP. Works in the browser (Chromium-based only), with no API connectors, middleware or IT project. Workday is the featured platform.
Services page: labeled an "Official Partner" with a link to Workday's services partner directory.

WORKDAY SUPPORT (services page)
- Ticket intake from the tenant by voice and screen share; screenshots, URLs, tenant details and timestamps captured automatically.
- Routed to a senior expert, with a dedicated team member per client. Clients can "pin" experts who handled past issues; Mando carries forward knowledge of the customer's security model, business processes and integrations.
- Progress visible in a client dashboard. Each resolution includes step-by-step documentation.
- On-demand consultations with transcripts, summaries and documentation.
- Response tiers: same day, next day or two days; the page says customers often get responses within minutes.
- Pricing: no minimum commitment, billing "tied to documented deliverables". Contrasted with traditional AMS, "optimized for billing hours". No prices listed; an AMS cost calculator is linked.
- Capacity can flex with workload (example: Open Enrollment) "without change orders or contract renegotiations".
- Sample expert: Workday HCM Solution Architect, 10 years of experience; areas listed include Core HCM, Recruiting, Security, Professional Services, Hospitality and Technology.

TESTING (solutions/testing)
- Test cases come from captured sessions of real workflows. "Nobody writes scripts and nobody maintains a suite."
- Computer vision decides pass or fail. Sessions build a visual map of the tenant's screens and fields.
- Replays the full workflow library against a Workday preview tenant for an impact assessment, which the page says is available "weeks before the release reaches your production environment".
- Scheduled runs (nightly, weekly or custom) and alerts. Failure reports include a screenshot at each step.
- Not stated on the page: Workday's release cadence, which modules are supported, or any measured results.

DOCUMENTATION, AUDIT AND SECURITY (homepage)
- Records changes at the screen level, generates SOPs, flags configuration drift from a "Gold Standard", maps downstream dependencies before changes, and keeps SOC 2-style logs of modifications.
- Masks PII, dedicated cloud infrastructure, U.S. servers, customer data not used to train models for other customers. SOC 2 Type II certified (blog announcement).

WHO IT IS FOR AND PROOF
- Targets application owners and admins: HRIS and systems leads. This matches the contacts we are pursuing.
- Public testimonials: Jess Wagner, HRIS Systems Lead at Deluxe ("Documentation that would have taken us an entire day to build got shrunk down to a 1 hour session."); Tami Olsen, Systems Lead at City of Provo; Christian Delcid, Global HRIS Lead at Asahi Kasei ("If Mando's not bringing back what I'm looking for, it's nowhere else.").
- No measured results, no pricing, no case studies beyond these testimonials. Ask before quoting any of them in an email.

BLOG THEMES USEFUL FOR HOOKS
"Your Core HCM Lead Gets Hit by a Bus. What Next?" (undocumented Workday knowledge is a risk when a key person leaves); "The Era of AI-Powered Workday Support" (overloaded internal admins and costly AMS firms); Workday prompting and reporting posts; "Mando is SOC 2 Type II Certified".

OPEN QUESTIONS FOR ADI
- The homepage pitches an AI platform; the services page pitches Workday support. Which should lead in outreach?
- Is "weeks before the release" the claim we want to make? It is Mando's own wording.
- Which testimonials, if any, may be quoted?
- Do we want to mention the Workday partner listing?`,
};

export type Customization = {
  voice: string; ask: string; signOff: string; avoid: string[]; example: string; facts: string; hooks: string[];
  angles: Record<Trigger, string>;
  limits: { emailWords: number; subjectWords: number; goLiveDays: number };
};

const lines = (text: string) => text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

// The prompt builder only sees these fields; research notes are for people, not for the model.
export function toCustomization(s: OutreachSettings): Customization {
  return {
    voice: s.voice, ask: s.ask, signOff: s.sign_off, avoid: lines(s.avoid), example: s.example, facts: s.mando_facts, hooks: lines(s.hooks),
    angles: { "go-live": s.angle_go_live, "job-posting": s.angle_job_posting, release: s.angle_release, general: s.angle_general },
    limits: { emailWords: s.email_max_words, subjectWords: s.subject_max_words, goLiveDays: s.go_live_window_days },
  };
}

export const defaultCustomization = toCustomization(defaultSettings);

// Saved settings win; anything missing falls back to the defaults. A bad saved row falls back entirely, with the reason.
export function resolveSettings(saved: unknown): { settings: OutreachSettings; error?: string } {
  const parsed = settingsSchema.safeParse({ ...defaultSettings, ...(saved && typeof saved === "object" ? saved : {}) });
  return parsed.success ? { settings: parsed.data } : { settings: defaultSettings, error: parsed.error.issues.map(i => i.message).join(" ") };
}

// Fills {first_name}, {company} and {sign_off} in a starter message. Unknown {words} are left alone.
export function fillTemplate(template: string, values: { first_name: string; company: string; sign_off: string }) {
  return template.replace(/\{(first_name|company|sign_off)\}/g, (_, key: keyof typeof values) => values[key]);
}
