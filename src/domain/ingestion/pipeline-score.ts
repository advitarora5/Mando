import type { Category } from "../contracts/company.ts";
import { buildAssessment, type AssessmentResult, type CategoryInput } from "../scoring/assessment.ts";
import { goLiveScore, daysSince } from "../scoring/go-live.ts";
import { releaseScore } from "../scoring/releases.ts";
import { rubric } from "../scoring/rubric.ts";
import { isSignalFresh, readyForContacts, type PipelineSettings } from "./settings.ts";
import { classifyTitle } from "./titles.ts";

// Pipeline scoring policy. Weights, tiers, bands and evidence rules are the shared rubric's
// (src/domain/scoring); this file only turns sourced signals and contacts into category inputs.
// Every awarded point carries the signal's or contact's source link. No evidence is "Needs evidence",
// written as "Assessment status: unknown", which the dashboard shows as Not Enough Evidence.
export const PIPELINE_POLICY_VERSION = "pipeline-v1";

export const signalTypes = ["go_live", "hiring", "release_planning", "known_customer", "budget_clue", "event"] as const;
export type SignalType = (typeof signalTypes)[number];
export const projectTypes = ["implementation", "release_testing", "integration", "support"] as const;
export type ProjectType = (typeof projectTypes)[number];

export type ScoringSignal = {
  type: SignalType;
  signal_date: string | null;
  source_url: string;
  quote: string;
  confidence: number;
  first_seen_at: string;
  last_seen_at: string;
  project_type?: ProjectType | null;
};

export type ScoringContact = {
  name: string;
  title: string | null;
  source: string | null;
  linkedin_url: string | null;
  email: string | null;
  email_status: string | null;
  email_source?: string | null;
  phone: string | null;
  phone_status: string | null;
  phone_source?: string | null;
  mutual_connection: string | null;
  // Contact-level conviction evidence, e.g. a dated talk about their Workday program: { source, reason }.
  conviction?: { source: string; reason: string } | null;
};

export type CategoryResult = CategoryInput & { status: "met" | "partial" | "unknown" | "not_met"; detail: Record<string, number> };

const http = (value: string | null | undefined) => (value && /^https?:\/\//i.test(value) ? value : null);
const short = (quote: string) => (quote.length > 110 ? `${quote.slice(0, 107)}...` : quote).replace(/\s+/g, " ");
const needs = (what: string, detail: Record<string, number> = {}): CategoryResult =>
  ({ score: 0, source: null, reason: `Needs evidence: ${what}`, status: "unknown", detail });

// Authority 0-25 from contacts: functional relevance 0-10 + seniority 0-8 + owns Workday 0-4 for the best contact,
// plus coverage 0-3 (number of relevant contacts). Capped at 5 when the best contact's function is unrelated.
export function authorityFromContacts(contacts: ScoringContact[]): CategoryResult {
  if (!contacts.length) return needs("no contacts yet; contact lookup is pending.");
  const rated = contacts.map(contact => {
    const cls = classifyTitle(contact.title);
    return { contact, cls, base: cls.functional + cls.seniority + cls.ownsWorkday, source: http(contact.source) ?? http(contact.linkedin_url) };
  }).filter(r => r.source).sort((a, b) => b.base - a.base);
  if (!rated.length) return needs("contacts have no source link for their role.");
  const best = rated[0];
  const coverage = Math.min(3, rated.filter(r => r.cls.functional > 0).length);
  let score = Math.min(rubric.authority.weight, best.base + coverage);
  if (best.cls.functional === 0) score = Math.min(score, 5);
  const detail = { functional: best.cls.functional, seniority: best.cls.seniority, owns_workday: best.cls.ownsWorkday, coverage };
  return {
    score, source: best.source, status: best.cls.functional > 0 ? "met" : "partial", detail,
    reason: `${best.contact.name}, ${best.contact.title ?? "title unknown"}: function ${detail.functional}/10 (${best.cls.functionLabel}), seniority ${detail.seniority}/8, owns Workday ${detail.owns_workday}/4, coverage ${coverage}/3${best.cls.functional === 0 ? ", capped at 5 (unrelated function)" : ""}.`,
  };
}

// Reachability 0-25 from contact-level signals only: verified channel 0-9 + warm path 0-8 + conviction 0-8.
export function reachabilityFromContacts(contacts: ScoringContact[]): CategoryResult {
  if (!contacts.length) return needs("no contacts yet; contact lookup is pending.");
  const rated = contacts.map(contact => {
    const channels: [number, string, string | null][] = [
      [contact.email && contact.email_status === "valid" ? 9 : 0, "verified work email", http(contact.email_source) ?? http(contact.source)],
      [contact.phone && contact.phone_status === "live" ? 7 : 0, "live phone line (not proof of ownership)", http(contact.phone_source) ?? http(contact.source)],
      [contact.linkedin_url ? 4 : 0, "LinkedIn profile", http(contact.linkedin_url)],
      [contact.email && contact.email_status !== "invalid" ? 3 : 0, "unverified email", http(contact.email_source) ?? http(contact.source)],
    ];
    const [channel, label, source] = channels.filter(c => c[2]).sort((a, b) => b[0] - a[0])[0] ?? [0, "no channel", null];
    const warm = contact.mutual_connection?.trim() ? 8 : 0;
    const conviction = contact.conviction && http(contact.conviction.source) ? 8 : 0;
    return { contact, channel, label, source, warm, conviction, total: channel + warm + conviction };
  }).sort((a, b) => b.total - a.total);
  const best = rated[0];
  if (!best.total || !best.source) return needs(`no sourced channel for ${contacts.length} contact(s).`);
  const detail = { verified_channel: best.channel, warm_path: best.warm, conviction: best.conviction };
  return {
    score: Math.min(rubric.reachability.weight, best.total), source: best.source, status: "met", detail,
    reason: `${best.contact.name}: ${best.label} ${best.channel}/9, warm path ${best.warm}/8, conviction ${best.conviction}/8.`,
  };
}

const activeProject = (s: ScoringSignal) => s.project_type === "implementation" || s.project_type === "integration" || s.project_type === "release_testing";

// Budget 0-20 from adjacent-purchase signals: the best signal of each kind, summed and capped.
export function budgetFromSignals(signals: ScoringSignal[]): CategoryResult {
  const parts: { points: number; signal: ScoringSignal; label: string }[] = [];
  const pick = (list: ScoringSignal[], points: (s: ScoringSignal) => number, label: string) => {
    const best = list.map(signal => ({ signal, points: points(signal) })).sort((a, b) => b.points - a.points)[0];
    if (best && best.points > 0) parts.push({ ...best, label });
  };
  pick(signals.filter(s => s.type === "budget_clue"), s => (s.confidence >= 0.8 ? 10 : 6), "adjacent purchase or funded project");
  pick(signals.filter(s => s.type === "hiring" && activeProject(s)), () => 6, "funded Workday project headcount");
  // A posting that only lists Workday as a skill (confidence < 0.8) is weaker than a Workday role.
  pick(signals.filter(s => s.type === "hiring" && !activeProject(s)), s => (s.confidence >= 0.8 ? 3 : 1), "Workday role headcount");
  pick(signals.filter(s => s.type === "known_customer"), () => 2, "pays for Workday today");
  if (!parts.length) return needs("no budget or adjacent-purchase signal in the last 14 days.");
  parts.sort((a, b) => b.points - a.points);
  const score = Math.min(rubric.budget.weight, parts.reduce((sum, p) => sum + p.points, 0));
  return {
    score, source: parts[0].signal.source_url, status: parts.some(p => p.points >= 6) ? "met" : "partial",
    detail: Object.fromEntries(parts.map(p => [p.label, p.points])),
    reason: `${parts.map(p => `${p.label} ${p.points}`).join(" + ")} (proxy, not committed funds): "${short(parts[0].signal.quote)}"`,
  };
}

// Release 0-15 only from public release-planning signals, scored by the shared release calendar.
// A Workday customer with no release-planning signal gets a low neutral 3, so accounts no longer share one number.
export function releaseFromSignals(signals: ScoringSignal[], now: Date): CategoryResult {
  const planning = signals.find(s => s.type === "release_planning") ?? signals.find(s => s.type === "hiring" && s.project_type === "release_testing");
  if (planning) {
    const calendar = releaseScore(now);
    return { score: calendar.score, source: planning.source_url, status: "met", detail: { calendar: calendar.score },
      reason: `Public release-planning signal "${short(planning.quote)}"; ${calendar.reason}` };
  }
  const customer = signals.find(s => s.type === "known_customer");
  if (customer) return { score: 3, source: customer.source_url, status: "partial", detail: { neutral: 3 },
    reason: "Workday customer, so subject to the R1/R2 releases, but no public release-planning signal: low neutral 3." };
  return needs("no Workday customer or release-planning signal in the last 14 days.");
}

// Timing 0-15: go-live by the shared date bands; hiring decays with the posting's age; events add a small trigger.
export function timingFromSignals(signals: ScoringSignal[], now: Date): CategoryResult {
  const candidates: { points: number; signal: ScoringSignal; why: string }[] = [];
  for (const signal of signals) {
    if (signal.type === "go_live" && signal.signal_date) {
      const band = goLiveScore(signal.signal_date, now);
      candidates.push({ points: band.score, signal, why: band.reason });
    } else if (signal.type === "hiring") {
      const base = activeProject(signal) ? 10 : signal.confidence >= 0.8 ? 8 : 4;
      const age = Math.max(0, daysSince(signal.signal_date ?? signal.first_seen_at.slice(0, 10), now) ?? 0);
      const points = Math.round(base * Math.max(0.4, 1 - age / 90));
      candidates.push({ points, signal, why: `Workday hiring signal ${age} days old (${base} decayed to ${points})` });
    } else if (signal.type === "event") {
      candidates.push({ points: 5, signal, why: "Workday-related event" });
    }
  }
  const best = candidates.sort((a, b) => b.points - a.points)[0];
  // A go-live stated without a day ("scheduled for October 2026") is real evidence the bands cannot score: say so, with its link.
  const undated = signals.find(s => s.type === "go_live" && !s.signal_date);
  if (!best && undated) return { score: 0, source: undated.source_url, status: "unknown", detail: {},
    reason: `Needs evidence: go-live mentioned without a day-precise date, so the go-live bands cannot score it: "${short(undated.quote)}"` };
  if (!best) return needs("no go-live, hiring or event signal in the last 14 days.");
  if (!best.points) return { score: 0, source: best.signal.source_url, status: "not_met", detail: { points: 0 }, reason: `${best.why}.` };
  return { score: Math.min(rubric.timing.weight, best.points), source: best.signal.source_url, status: "met", detail: { points: best.points },
    reason: `${best.why}: "${short(best.signal.quote)}"` };
}

export type PipelineAssessment = {
  result: AssessmentResult;
  categories: Record<Category, CategoryResult>;
  ready_for_contacts: boolean;
  fresh_signals: number;
};

// Builds an insert-ready score row through the shared buildAssessment and tier evaluator.
export function scoreCompany(companyId: string, signals: ScoringSignal[], contacts: ScoringContact[], settings: PipelineSettings, now: Date = new Date()): PipelineAssessment {
  const fresh = signals.filter(s => s.type === "go_live" || isSignalFresh(s, settings, now));
  const categories: Record<Category, CategoryResult> = {
    authority: authorityFromContacts(contacts),
    reachability: reachabilityFromContacts(contacts),
    budget: budgetFromSignals(fresh),
    release: releaseFromSignals(fresh, now),
    timing: timingFromSignals(fresh, now),
  };
  const inputs = Object.fromEntries(Object.entries(categories).map(([key, c]) =>
    [key, { score: c.score, source: c.source, reason: `Assessment status: ${c.status}. ${c.reason}` }])) as Record<Category, CategoryInput>;
  const result = buildAssessment(companyId, inputs);
  if (result.ok) {
    result.row.rubric_version = `${result.row.rubric_version}:${PIPELINE_POLICY_VERSION}`;
    // An unsourced zero keeps its "Needs evidence" text without a link; a URL is never invented.
    for (const [key, c] of Object.entries(categories)) {
      if (!c.source) result.row[`${key as Category}_evidence`] = inputs[key as Category].reason ?? "";
    }
  }
  const ready = result.ok && readyForContacts(result.row, settings);
  return { result, categories, ready_for_contacts: ready, fresh_signals: fresh.length };
}
