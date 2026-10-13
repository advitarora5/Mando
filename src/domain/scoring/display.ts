import type { Score } from "@/domain/contracts/company";
import { categories, type Category } from "../contracts/company.ts";
import { parseEvidence } from "./evidence.ts";

// Display-only tier labelling. The stored tier value stays "Disqualified" — that is the
// shared scoring contract with Group 2 and must not change. Rule: we may only call a
// company "Disqualified" when all five categories have resolved evidence. A research
// link admitting that a criterion is unknown/partial does not establish a failed criterion.
export const NEEDS_EVIDENCE = "Not Enough Evidence";
type DisplayScore = Pick<Score, "tier"> & Partial<Pick<Score, `${Category}_evidence`>>;

export function incompleteCategories(score: DisplayScore): Category[] {
  return categories.filter(category => {
    const evidence = parseEvidence(score[`${category}_evidence`]);
    if (!evidence) return true;
    const status = evidence.reason.match(/Assessment status:\s*(met|not_met|unknown|partial)\./i)?.[1]?.toLowerCase();
    if (status) return status === "unknown" || status === "partial";
    // Legacy research notes can have a valid link while explicitly admitting that the fact is missing.
    return /\b(?:no|not)\s+(?:verified|confirmed)\b|information not available|\b(?:pending|awaiting|unmapped)\b|requires? (?:review|verification)/i.test(evidence.reason);
  });
}

export function displayTier(score: DisplayScore | null): string {
  if (!score) return "Unscored";
  if (score.tier === "Disqualified") {
    return incompleteCategories(score).length ? NEEDS_EVIDENCE : "Disqualified";
  }
  return score.tier;
}

// CSS classes follow the label, including not-enough-evidence.
export function tierSlug(score: DisplayScore | null): string {
  return displayTier(score).toLowerCase().replace(/\s+/g, "-");
}
