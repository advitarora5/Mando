import type { Category, Score } from "../contracts/company.ts";
import { incompleteCategories, displayTier, NEEDS_EVIDENCE } from "./display.ts";
import { rubric } from "./rubric.ts";

// Presentation helpers only. They read the same score rows and tier rules; no number changes meaning.

export type TierKey = "qualified" | "maybe" | "disqualified" | "needs" | "unscored";
export const tierLabel: Record<TierKey, string> = { qualified: "Qualified", maybe: "Maybe", disqualified: "Disqualified", needs: "Needs evidence", unscored: "Unscored" };

export function tierKey(score: Score | null): TierKey {
  const tier = displayTier(score);
  if (tier === NEEDS_EVIDENCE) return "needs";
  return tier.toLowerCase() as TierKey;
}

export type CategoryCell = {
  category: Category;
  points: number | null;
  max: number;
  // Evidence is missing or only partial. With 0 points this renders as "Needs evidence", never as a low score.
  incomplete: boolean;
  needsEvidence: boolean;
};

export function categoryCells(score: Score | null): CategoryCell[] {
  const incomplete = score ? new Set(incompleteCategories(score)) : new Set<Category>();
  return (Object.keys(rubric) as Category[]).map(category => {
    const points = score ? Number(score[`${category}_score`]) : null;
    const missing = incomplete.has(category);
    return { category, points, max: rubric[category].weight, incomplete: missing, needsEvidence: missing && !points };
  });
}

export function barLevel(points: number, max: number): "low" | "mid" | "high" {
  const share = max ? points / max : 0;
  return share >= 0.67 ? "high" : share >= 0.34 ? "mid" : "low";
}

export const shortLabel: Record<Category, string> = { authority: "Authority", reachability: "Reach", budget: "Budget", release: "Release", timing: "Timing" };
