/** Display wording; persisted tiers remain compatible with the scoring contract. */
export function tierLabel(tier: string | null | undefined): string {
  return tier === "Disqualified" ? "Not enough evidence" : tier ?? "Unscored";
}
