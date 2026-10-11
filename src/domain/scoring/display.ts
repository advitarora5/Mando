import type { Score } from "@/domain/contracts/company";
import { hasEvidence } from "./evidence.ts";

// Display-only tier labelling. The stored tier value stays "Disqualified" — that is the
// shared scoring contract with Group 2 and must not change. Rule: we may only call a
// company "Disqualified" when we hold the evidence to back it. If Authority or
// Reachability evidence is missing, the company reads "Needs evidence" instead, because
// we cannot confidently disqualify it yet. The specific cause is still shown separately
// via the score's tier_reason.
export const NEEDS_EVIDENCE = "Needs evidence";

export function displayTier(score: Pick<Score, "tier" | "authority_evidence" | "reachability_evidence"> | null): string {
  if (!score) return "Unscored";
  if (score.tier === "Disqualified") {
    const evidenceComplete = hasEvidence(score.authority_evidence) && hasEvidence(score.reachability_evidence);
    return evidenceComplete ? "Disqualified" : NEEDS_EVIDENCE;
  }
  return score.tier;
}

// CSS class slug for the tier badge: qualified | maybe | disqualified | needs-evidence | unscored.
export function tierSlug(score: Pick<Score, "tier" | "authority_evidence" | "reachability_evidence"> | null): string {
  return displayTier(score).toLowerCase().replace(/\s+/g, "-");
}

