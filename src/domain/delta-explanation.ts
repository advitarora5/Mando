import { rankMovement } from "./history.ts";

// Why did a company's rank move? Compares the score behind last week's rank with the current score and names the cause.
// Pure and deterministic: every sentence is a stated fact from the two assessments and the contacts added between them.
const CATS = ["authority", "reachability", "budget", "release", "timing"] as const;
type Cat = (typeof CATS)[number];
const LABEL: Record<Cat, string> = { authority: "Authority", reachability: "Reachability", budget: "Budget", release: "Release", timing: "Timing" };

export type ScoreSnapshot = {
  id: string; assessed_at: string; rubric_version?: string | null; total: number; tier?: string | null;
  authority_score: number; reachability_score: number; budget_score: number; release_score: number; timing_score: number;
  authority_evidence?: string | null; reachability_evidence?: string | null; budget_evidence?: string | null; release_evidence?: string | null; timing_evidence?: string | null;
};
export type NewContact = { name: string; title?: string | null };
export type DeltaCause = "contacts" | "rubric" | "scores" | "others" | "new" | "unknown";
export type DeltaExplanation = { cause: DeltaCause; summary: string; reasons: string[] };
export type DeltaInput = {
  currentRank?: number; previousRank?: number;
  current: ScoreSnapshot | null; previous: ScoreSnapshot | null;
  // Contacts added after the earlier assessment and no later than the current one.
  newContacts: NewContact[];
};

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
const shortName = (c: NewContact) => (c.title ? `${c.name} (${c.title})` : c.name);

export function explainDelta(input: DeltaInput): DeltaExplanation | null {
  const move = rankMovement(input.currentRank, input.previousRank);
  if (!move || move.kind === "same") return null;
  if (move.kind === "new") return { cause: "new", summary: "New to the ranking since last week.", reasons: [] };

  const head = `Moved ${move.kind} ${move.places} ${plural(move.places, "place")} (rank ${move.from} to ${input.currentRank}).`;
  const { current: cur, previous: prev } = input;
  if (!cur || !prev) return { cause: "unknown", summary: `${head} The earlier assessment is not available to compare.`, reasons: [] };

  const diffs = CATS.map(c => ({ c, from: prev[`${c}_score`], to: cur[`${c}_score`] })).filter(d => d.from !== d.to);
  const reasons: string[] = [];
  const authReach = diffs.filter(d => d.c === "authority" || d.c === "reachability");
  const contacts = input.newContacts;
  const names = contacts.slice(0, 3).map(shortName).join(", ") + (contacts.length > 3 ? ` and ${contacts.length - 3} more` : "");

  const rubricChanged = !!prev.rubric_version && !!cur.rubric_version && prev.rubric_version !== cur.rubric_version;
  let cause: DeltaCause;
  if (authReach.length && contacts.length) {
    cause = "contacts";
    reasons.push(`New ${plural(contacts.length, "contact")} (${names}) changed ${list(authReach.map(d => `${LABEL[d.c]} ${d.from} to ${d.to}`))}.`);
  } else if (rubricChanged && diffs.length) {
    cause = "rubric";
    if (authReach.length) reasons.push(`${list(authReach.map(d => LABEL[d.c]))} changed after rescoring under a new rubric version; no new contacts were added.`);
  } else if (authReach.length) {
    cause = "scores";
    reasons.push(`${list(authReach.map(d => LABEL[d.c]))} changed with updated contact or role evidence; no new contacts were added.`);
  } else if (diffs.length) {
    cause = "scores";
  } else {
    cause = "others";
  }
  if (contacts.length && !authReach.length) reasons.push(`${contacts.length} new ${plural(contacts.length, "contact")} added (${names}); Authority and Reachability did not change.`);

  for (const d of diffs) {
    if (authReach.includes(d) && cause === "contacts") continue; // already said above
    const evidenceKey = `${d.c}_evidence` as const;
    const timeOnly = (d.c === "timing" || d.c === "release") && (cur[evidenceKey] ?? "") === (prev[evidenceKey] ?? "");
    reasons.push(`${LABEL[d.c]} ${d.from} to ${d.to} (${signed(d.to - d.from)})${timeOnly ? ": the evidence is unchanged, so this follows the calendar" : ""}.`);
  }
  if (rubricChanged) reasons.unshift(`Rescored under a different rubric version (${prev.rubric_version} to ${cur.rubric_version}).`);
  if (cur.total !== prev.total) reasons.push(`Total ${prev.total} to ${cur.total} (${signed(cur.total - prev.total)}).`);
  if (prev.tier && cur.tier && prev.tier !== cur.tier) reasons.push(`Tier ${prev.tier} to ${cur.tier}.`);
  if (cur.total > prev.total && move.kind === "down") reasons.push("Own total went up, but companies above it rose by more.");
  if (cur.total < prev.total && move.kind === "up") reasons.push("Own total fell, but companies above it fell by more.");
  if (cause === "others") reasons.push(`Own score is unchanged at ${cur.total}; the move comes from other companies' scores changing.`);

  const rubricNote = rubricChanged && cause !== "rubric" ? " Also rescored under a new rubric version." : "";
  const causeText = cause === "contacts" ? `New contacts changed ${list(authReach.map(d => LABEL[d.c]))}.${rubricNote}`
    : cause === "rubric" ? `Rescored under a new rubric version: ${list(diffs.slice(0, 3).map(d => `${LABEL[d.c]} ${d.from} to ${d.to}`))}${diffs.length > 3 ? ` and ${diffs.length - 3} more` : ""}.`
    : cause === "others" ? "Own score is unchanged; other companies' scores changed."
    : `${list(diffs.slice(0, 3).map(d => `${LABEL[d.c]} ${d.from} to ${d.to}`))}${diffs.length > 3 ? ` and ${diffs.length - 3} more` : ""}.`;
  return { cause, summary: `${head} ${causeText}`, reasons };
}
