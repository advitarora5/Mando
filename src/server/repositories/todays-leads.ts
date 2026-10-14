import { requirePageSession } from "@/server/auth/session";
import "server-only";
import { database } from "@/server/db";
import type { CompanyListItem, Score } from "@/domain/contracts/company";
import { applyTierRules } from "@/domain/scoring/tier-rules";
import type { StoredDraft } from "@/server/repositories/outreach-drafts";

// A lead for the review view: a company plus its outreach drafts, on top of the list item.
export interface TodaysLead extends CompanyListItem {
  drafts: StoredDraft[];
}

// Everything the review view needs in one query: score, contacts (with reach fields),
// why-now, lead status and dates, and outreach drafts. On failure it returns an empty set
// with a message so the page still renders instead of crashing.
export async function getTodaysLeads(): Promise<{ leads: TodaysLead[]; error?: string }> {
  await requirePageSession();
  try {
    const { data, error } = await database().from("companies")
      .select("*, scores(*), company_insights(*), contacts(*), outreach_drafts(id, contact_id, channel, subject, body, trigger, edited, sent_at)");
    if (error) throw error;
    const leads = (data ?? []).map((row) => {
      const scores = (row.scores as Score[]) ?? [];
      const saved = scores.sort((a, b) => b.assessed_at.localeCompare(a.assessed_at))[0];
      const insight = Array.isArray(row.company_insights) ? row.company_insights[0] : row.company_insights;
      return {
        ...(row as CompanyListItem),
        contacts: row.contacts ?? [],
        score: saved ? applyTierRules(saved) : null,
        why_now: insight?.why_now_override ?? insight?.why_now_generated ?? null,
        drafts: (row.outreach_drafts as StoredDraft[]) ?? [],
      };
    });
    return { leads };
  } catch (error) {
    return { leads: [], error: error instanceof Error ? error.message : "Could not load today's leads." };
  }
}
