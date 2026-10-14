// Display rules for buyer contacts, shared by the company table and the company page.
// email_verified stays the source of truth for "Verified"; email_status adds the enrichment nuance.

export interface ContactSummary {
  name: string;
  title: string | null;
  linkedin_url: string | null;
  email?: string | null;
  email_verified?: boolean;
  email_status?: string | null;
  linkedin_status?: string | null;
  phone?: string | null;
}

export type ContactFunction = "hr-systems" | "hr-leadership" | "technology" | "other";
export type EmailState = "verified" | "unverified" | "risky" | "invalid" | "not_found" | "none";

const hrSystems = /\b(hris|hr systems?|hr information|hr technology|hr operations|people tech|workday|functional owner|enterprise (apps|applications)|financial systems)\b|workforce (&|and) operations technology/i;
const hrLeadership = /\b(chief people|people officer|chro|chief human|human resources?|human capital|people (and|&) (culture|organi[sz]ation|transformation)|hr\b|talent|workforce|payroll|people)\b/i;
const technology = /\b(cio|cto|ciso|chief (information|technology|digital|ai)|information technology|technology|digital|it service|architect|transformation)\b/i;

export const functionLabel: Record<ContactFunction, string> = {
  "hr-systems": "HR systems",
  "hr-leadership": "HR leadership",
  technology: "Technology",
  other: "Other",
};

export function contactFunction(title: string | null): ContactFunction {
  if (!title) return "other";
  if (hrSystems.test(title)) return "hr-systems";
  if (hrLeadership.test(title)) return "hr-leadership";
  if (technology.test(title)) return "technology";
  return "other";
}

export function emailState(contact: ContactSummary): EmailState {
  if (!contact.email) return contact.email_status === "invalid" ? "invalid" : contact.email_status === "not_found" ? "not_found" : "none";
  if (contact.email_verified) return "verified";
  if (contact.email_status === "risky" || contact.email_status === "invalid") return contact.email_status;
  return "unverified";
}

export function emailLabel(contact: ContactSummary) {
  const state = emailState(contact);
  if (state === "verified") return "Verified";
  if (state === "risky") return "Risky";
  if (state === "unverified") return "Unverified";
  if (state === "invalid") return contact.email ? "Failed verification" : "Searched · no valid email";
  if (state === "not_found") return "Searched · not found";
  return "No email recorded";
}

const functionOrder: Record<ContactFunction, number> = { "hr-systems": 0, "hr-leadership": 1, technology: 2, other: 3 };
const emailOrder: Record<EmailState, number> = { verified: 0, unverified: 1, risky: 2, invalid: 3, not_found: 4, none: 4 };

// Most relevant buyer first: HR systems owners, then HR leaders, then IT; reachable people before unreachable.
export function rankContacts<T extends ContactSummary>(contacts: T[]): T[] {
  return contacts.toSorted((a, b) =>
    functionOrder[contactFunction(a.title)] - functionOrder[contactFunction(b.title)]
    || emailOrder[emailState(a)] - emailOrder[emailState(b)]
    || Number(!a.linkedin_url) - Number(!b.linkedin_url)
    || a.name.localeCompare(b.name));
}

export function reachSummary(contacts: ContactSummary[]) {
  return {
    total: contacts.length,
    verified: contacts.filter(c => emailState(c) === "verified").length,
    linkedin: contacts.filter(c => c.linkedin_url).length,
    phone: contacts.filter(c => c.phone).length,
  };
}

export interface Provenance {
  emailSource: string | null;
  emailVerification: string | null;
  flags: string[];
  linkedinCandidate: string | null;
  linkedinNote: string | null;
  companyLine: string | null;
  providerTitle: string | null;
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

// contact_sources is free-form jsonb written by enrichment runs; read it defensively.
export function contactProvenance(raw: unknown): Provenance {
  const sources = record(raw);
  const email = record(sources.email);
  const check = record(sources.email_verification);
  const linkedin = record(sources.linkedin);
  const extras = record(sources.free_extras);
  const checkText = text(check.verdict) && `${text(check.verdict)}${text(check.checked_by) ? ` via ${text(check.checked_by)}` : ""}`;
  return {
    emailSource: text(email.source),
    emailVerification: text(email.verification) ?? checkText ?? null,
    flags: [email.flag, check.note && text(check.verdict) === "invalid" ? check.note : null].map(text).filter((f): f is string => !!f),
    linkedinCandidate: text(linkedin.status) === "unconfirmed" ? text(linkedin.candidate_url) : null,
    linkedinNote: text(linkedin.confirmation) ?? text(linkedin.note),
    companyLine: text(extras.company_hq_line) ?? text(extras.company_direct_line),
    providerTitle: text(extras.provider_title),
  };
}
