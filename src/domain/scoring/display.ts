import type { Score } from "@/domain/contracts/company";

// Display-only tier labelling. The stored tier value stays "Disqualified" — that is the
// shared scoring contract with Group 2 and must not change. The UI never shows the word
// "Disqualified": a non-qualifying company is framed as "Needs evidence", which is
// actionable for a rep. The specific cause (missing evidence, below 55, timing-only) is
// still shown separately via the score's tier_reason.
export const NEEDS_EVIDENCE = "Needs evidence";

export function displayTier(score: Pick<Score, "tier"> | null): string {
  if (!score) return "Unscored";
  if (score.tier === "Disqualified") return NEEDS_EVIDENCE;
  return score.tier;
}

// CSS class slug for the tier badge: qualified | maybe | needs-evidence | unscored.
export function tierSlug(score: Pick<Score, "tier"> | null): string {
  return displayTier(score).toLowerCase().replace(/\s+/g, "-");
}
