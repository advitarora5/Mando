import type { Category, CompanyListItem } from "../../domain/contracts/company.ts";
import { categories } from "../../domain/contracts/company.ts";
import { queryCompanies, type Sort } from "../company-list/query.ts";
import { emailState, rankContacts } from "../../domain/contacts/contact-view.ts";
import { categoryCells, tierKey, type TierKey } from "../../domain/scoring/view.ts";

// Pipeline filter state. Everything here is derived from stored rows; nothing is invented.

export type View = "all" | "qualified" | "maybe" | "needs" | "ready";
export type CategorySort = `${Category}-${"asc" | "desc"}`;
export type PipelineSort = Sort | CategorySort;
export type PipelineState = { q: string; tier: string; min: string; max: string; sort: PipelineSort; view: View; verified: boolean; gaps: boolean; release: boolean };

export const defaultState: PipelineState = { q: "", tier: "All", min: "", max: "", sort: "rank-asc", view: "all", verified: false, gaps: false, release: false };
export const views: { id: View; label: string; hint: string }[] = [
  { id: "all", label: "All companies", hint: "Every company, ranked by total score" },
  { id: "qualified", label: "Qualified", hint: "Total 80+ with complete evidence" },
  { id: "maybe", label: "Maybe", hint: "Total 55–79" },
  { id: "needs", label: "Needs evidence", hint: "Below Maybe, but at least one category is unresolved — not a rejection" },
  { id: "ready", label: "Ready for outreach", hint: "Qualified or Maybe, still queued, with a verified email contact" },
];
export const tierOptions = [
  { value: "All", label: "Any tier" }, { value: "Qualified", label: "Qualified" }, { value: "Maybe", label: "Maybe" },
  { value: "Not Enough Evidence", label: "Needs evidence" }, { value: "Disqualified", label: "Disqualified" }, { value: "Unscored", label: "Unscored" },
];

const sorts = new Set<string>(["score-desc", "score-asc", "name-asc", "name-desc", "employees-desc", "employees-asc", "rank-asc", "rank-desc", "tier-asc", "tier-desc", ...categories.flatMap(c => [`${c}-asc`, `${c}-desc`])]);

export function fromParams(params: URLSearchParams): PipelineState {
  const sort = params.get("sort") ?? "";
  const view = params.get("view") ?? "";
  return {
    q: params.get("q") ?? "",
    tier: tierOptions.some(o => o.value === params.get("tier")) ? params.get("tier")! : "All",
    min: /^\d{1,3}$/.test(params.get("min") ?? "") ? params.get("min")! : "",
    max: /^\d{1,3}$/.test(params.get("max") ?? "") ? params.get("max")! : "",
    sort: sorts.has(sort) ? sort as PipelineSort : "rank-asc",
    view: views.some(v => v.id === view) ? view as View : "all",
    verified: params.get("verified") === "1",
    gaps: params.get("gaps") === "1",
    release: params.get("release") === "1",
  };
}

export function toParams(state: PipelineState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.view !== "all") params.set("view", state.view);
  if (state.tier !== "All") params.set("tier", state.tier);
  if (state.min) params.set("min", state.min);
  if (state.max) params.set("max", state.max);
  if (state.verified) params.set("verified", "1");
  if (state.gaps) params.set("gaps", "1");
  if (state.release) params.set("release", "1");
  if (state.sort !== "rank-asc") params.set("sort", state.sort);
  return params.toString();
}

export const hasVerifiedEmail = (c: CompanyListItem) => c.contacts.some(contact => emailState(contact) === "verified");
export const hasEvidenceGaps = (c: CompanyListItem) => categoryCells(c.score).some(cell => cell.needsEvidence);
// Release scores of 5–8 are the "more than 18 weeks out" or confirmed-customer baseline; above 8 means a readiness window.
export const isReleasePlanner = (c: CompanyListItem) => !!c.score && Number(c.score.release_score) > 8;
export const isReady = (c: CompanyListItem) => {
  const tier = tierKey(c.score);
  return (tier === "qualified" || tier === "maybe") && c.lead_status === "queued" && hasVerifiedEmail(c);
};

export function rangeError(state: PipelineState): string | null {
  const min = state.min === "" ? null : Number(state.min);
  const max = state.max === "" ? null : Number(state.max);
  if ([min, max].some(n => n !== null && (!Number.isFinite(n) || n < 0 || n > 100))) return "Scores must be between 0 and 100.";
  if (min !== null && max !== null && min > max) return "Minimum score must not exceed maximum score.";
  return null;
}

export function applyState(companies: CompanyListItem[], state: PipelineState): CompanyListItem[] {
  if (rangeError(state)) return [];
  const categorySort = categories.find(c => state.sort.startsWith(`${c}-`));
  const base = queryCompanies(companies, {
    search: state.q, tier: state.tier,
    min: state.min === "" ? null : Number(state.min), max: state.max === "" ? null : Number(state.max),
    sort: categorySort ? "rank-asc" : state.sort as Sort,
  });
  const viewMatch: Record<View, (c: CompanyListItem) => boolean> = {
    all: () => true,
    qualified: c => tierKey(c.score) === "qualified",
    maybe: c => tierKey(c.score) === "maybe",
    needs: c => tierKey(c.score) === "needs",
    ready: isReady,
  };
  const rows = base.filter(c => viewMatch[state.view](c)
    && (!state.verified || hasVerifiedEmail(c))
    && (!state.gaps || hasEvidenceGaps(c))
    && (!state.release || isReleasePlanner(c)));
  if (!categorySort) return rows;
  const direction = state.sort.endsWith("asc") ? 1 : -1;
  // Stable: ties keep rank order. Unscored companies always sort last.
  return rows.toSorted((a, b) => {
    if (!a.score || !b.score) return a.score === b.score ? 0 : a.score ? -1 : 1;
    return direction * (Number(a.score[`${categorySort}_score`]) - Number(b.score[`${categorySort}_score`]));
  });
}

export type Kpis = { companies: number; companiesDelta: number | null; byTier: Record<TierKey, number>; ready: number; contacts: number; verifiedContacts: number };
export function computeKpis(companies: CompanyListItem[], previousCompanyCount: number | null): Kpis {
  const byTier: Record<TierKey, number> = { qualified: 0, maybe: 0, disqualified: 0, needs: 0, unscored: 0 };
  let contacts = 0, verifiedContacts = 0;
  for (const c of companies) {
    byTier[tierKey(c.score)]++;
    contacts += c.contacts.length;
    verifiedContacts += c.contacts.filter(contact => emailState(contact) === "verified").length;
  }
  return { companies: companies.length, companiesDelta: previousCompanyCount === null ? null : companies.length - previousCompanyCount, byTier, ready: companies.filter(isReady).length, contacts, verifiedContacts };
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
export function toCsv(rows: CompanyListItem[], ranks: Map<string, number>): string {
  const header = ["Rank", "Company", "Domain", "Industry", "Employees", "Tier", "Total", "Authority", "Reachability", "Budget", "Release", "Timing", "Lead status", "Top contact", "Top contact title", "Top contact email", "Email status", "Why now"];
  const lines = rows.map(c => {
    const top = rankContacts(c.contacts)[0];
    return [ranks.get(c.id) ?? "", c.name, c.domain, c.industry, c.employee_count, c.score ? tierKey(c.score) : "unscored", c.score?.total,
      ...categories.map(cat => c.score?.[`${cat}_score`]), c.lead_status, top?.name, top?.title, top?.email, top ? emailState(top) : "", c.why_now].map(csvCell).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
