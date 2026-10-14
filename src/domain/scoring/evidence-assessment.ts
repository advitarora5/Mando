import type { Category } from "../contracts/company.ts";
import { buildAssessment } from "./assessment.ts";
import { goLiveScore } from "./go-live.ts";
import { releaseScore } from "./releases.ts";
import { rubric } from "./rubric.ts";
import { formatEvidence } from "./evidence.ts";

export type Finding = { source: string; reason: string };
export type Fact = Finding & { verified: boolean | null };
export type EvidenceAssessment = {
  company_id: string;
  workforce: Finding & { count: number | null };
  leadership: Fact;
  one_degree_connection: Fact;
  authority_and_willingness: Fact;
  adjacent_tool_purchase: Fact;
  purchase_timeline: Fact;
  financial_stability: Fact;
  workday_live: Fact;
  go_live: Finding & { date: string | null; historical_window_older_than_year: boolean };
};

export const EVIDENCE_POLICY_VERSION = "first20-evidence-v1";
// The repository supplies category maxima, not evidence-to-points bands for the first three categories.
// This explicit assessment policy implements the user's criteria. A verified adjacent-tool proxy earns
// half Budget credit, without pretending that it establishes a present purchase window or financial stability.
export function assessEvidence(facts: EvidenceAssessment, now = new Date()) {
  for (const [key, fact] of Object.entries(facts)) {
    if (key === "company_id") continue;
    if (!fact || typeof fact !== "object" || !formatEvidence(fact.source, fact.reason)) throw new Error(`${key} requires a source and reason.`);
    if ("verified" in fact && ![true, false, null].includes(fact.verified)) throw new Error(`${key} has an invalid verification state.`);
  }
  if (facts.workforce.count !== null && (!Number.isInteger(facts.workforce.count) || facts.workforce.count < 0)) throw new Error("Workforce must be a nonnegative integer or null.");
  if (facts.go_live.date && (!/^\d{4}-\d{2}-\d{2}$/.test(facts.go_live.date) || new Date(facts.go_live.date).toISOString().slice(0,10) !== facts.go_live.date)) throw new Error("Go-live requires a real exact YYYY-MM-DD date.");
  const states = {} as Record<Category, "met" | "not_met" | "unknown" | "partial">;
  const entries = {} as Record<Category, { score: number; source: string; reason: string }>;
  function entry(category: Category, score: number, state: typeof states[Category], source: string, reason: string) {
    states[category] = state;
    entries[category] = { score, source, reason: `Assessment status: ${state}. ${reason}` };
  }
  const size = facts.workforce.count;
  const authority = size !== null && size >= 3000 && facts.leadership.verified === true;
  const authorityFails = (size !== null && size < 3000) || facts.leadership.verified === false;
  entry("authority", authority ? rubric.authority.weight : 0, authority ? "met" : authorityFails ? "not_met" : "unknown",
    facts.leadership.source, `${facts.leadership.reason} Workforce ${size ?? "unknown"}; ${facts.workforce.reason} Workforce source: ${facts.workforce.source}.`);
  const reachable = authority && facts.one_degree_connection.verified === true && facts.authority_and_willingness.verified === true;
  const reachFails = facts.one_degree_connection.verified === false || facts.authority_and_willingness.verified === false;
  entry("reachability", reachable ? rubric.reachability.weight : 0, reachable ? "met" : reachFails ? "not_met" : "unknown",
    facts.one_degree_connection.source, `${facts.one_degree_connection.reason} ${facts.authority_and_willingness.reason} Conviction source: ${facts.authority_and_willingness.source}.`);
  const budget = facts.purchase_timeline.verified === true && facts.financial_stability.verified === true;
  const proxy = facts.adjacent_tool_purchase.verified === true;
  const budgetFails = facts.purchase_timeline.verified === false && facts.financial_stability.verified === false;
  entry("budget", budget ? rubric.budget.weight : proxy ? rubric.budget.weight / 2 : 0,
    budget ? "met" : proxy ? "partial" : budgetFails ? "not_met" : "unknown",
    budget ? facts.purchase_timeline.source : facts.adjacent_tool_purchase.source,
    `${facts.adjacent_tool_purchase.reason} ${facts.purchase_timeline.reason} ${facts.financial_stability.reason} Timeline source: ${facts.purchase_timeline.source}. Financial source: ${facts.financial_stability.source}.`);
  const release = releaseScore(now);
  entry("release", facts.workday_live.verified === true ? release.score : 0,
    facts.workday_live.verified === true ? "met" : "unknown", facts.workday_live.source,
    `${facts.workday_live.reason} ${release.reason} Calendar: https://github.com/advitarora5/Mando-CUBE/blob/main/src/domain/scoring/releases.ts. Estimated shared release dates do not establish company-specific purchase intent.`);
  const timing = goLiveScore(facts.go_live.date, now);
  const knownOld = facts.go_live.historical_window_older_than_year;
  entry("timing", knownOld ? 0 : timing.score, facts.go_live.date || knownOld ? (timing.score > 0 ? "met" : "not_met") : "unknown",
    facts.go_live.source, `${facts.go_live.reason} ${knownOld ? "Verified historical month/window is entirely older than 365 days; 0 points under the existing timing band. No exact day was invented." : timing.reason}`);
  const result = buildAssessment(facts.company_id, entries);
  if (!result.ok) throw new Error(result.errors.join(" "));
  result.row.rubric_version = `${result.row.rubric_version}:${EVIDENCE_POLICY_VERSION}`;
  return { ...result, states };
}
