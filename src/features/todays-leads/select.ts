import type { TodaysLead } from "@/server/repositories/todays-leads";
import type { LeadStatus } from "@/domain/contracts/company";
import { companyRanks, scoreOrder } from "../company-list/query.ts";

export type TodaysLeadsFilters = { limit?: number; status?: LeadStatus | "all" };

// Top-scored leads for Adi's twice-weekly review. Defaults to the 10 highest-scored
// queued leads; "all" ignores status. Ranks are competition ranks over the full scored
// set (reused from the dashboard query) so a lead's number matches the main list.
// Unscored companies are never leads.
export function selectTodaysLeads(leads: TodaysLead[], { limit = 10, status = "queued" }: TodaysLeadsFilters = {}) {
  const ranks = companyRanks(leads);
  const scored = leads.filter(lead => lead.score);
  const pool = status === "all" ? scored : scored.filter(lead => lead.lead_status === status);
  return pool.toSorted(scoreOrder).slice(0, limit).map(lead => ({ lead, rank: ranks.get(lead.id) ?? null }));
}
