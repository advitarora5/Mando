import "server-only";
import { database } from "@/server/db";
import { requirePageSession } from "@/server/auth/session";
import type { CompanyListItem } from "@/domain/contracts/company";
import type { Snapshot } from "@/domain/history";
import { previousRanks } from "@/domain/history";
import { explainDelta, type DeltaExplanation, type NewContact, type ScoreSnapshot } from "@/domain/delta-explanation";
import { companyRanks } from "@/features/company-list/query";

const SCORE_COLUMNS = "id, company_id, assessed_at, rubric_version, total, tier, authority_score, reachability_score, budget_score, release_score, timing_score, authority_evidence, reachability_evidence, budget_evidence, release_evidence, timing_evidence";

// Explanations are optional context: any failure returns none so the dashboard still loads.
// previous = the score row behind each company's rank in the baseline week; current = its latest score.
export async function getDeltaExplanations({ companies, snapshots, week, only }: {
  companies: CompanyListItem[]; snapshots: Snapshot[]; week: string | null; only?: string;
}): Promise<Record<string, DeltaExplanation>> {
  await requirePageSession();
  if (!week || !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return {};
  try {
    const db = database();
    const baseline = snapshots.filter(s => s.week_start === week && s.score_id && (!only || s.company_id === only));
    const scoreIds = [...new Set(baseline.map(s => s.score_id!))];
    const previous = new Map<string, ScoreSnapshot & { company_id: string }>();
    for (let i = 0; i < scoreIds.length; i += 100) {
      const { data, error } = await db.from("scores").select(SCORE_COLUMNS).in("id", scoreIds.slice(i, i + 100));
      if (error) throw error;
      for (const row of data ?? []) previous.set(row.company_id, row);
    }
    if (!previous.size) return {};

    // Contacts added after the earlier assessment, grouped by company.
    const earliest = [...previous.values()].map(p => p.assessed_at).sort()[0];
    let query = db.from("contacts").select("company_id, name, title, created_at").gt("created_at", earliest).order("created_at");
    if (only) query = query.eq("company_id", only);
    const { data: contactRows, error } = await query;
    if (error) throw error;
    const added = new Map<string, (NewContact & { created_at: string })[]>();
    for (const row of contactRows ?? []) added.set(row.company_id, [...(added.get(row.company_id) ?? []), row]);

    const ranks = companyRanks(companies);
    const before = previousRanks(snapshots, week);
    const out: Record<string, DeltaExplanation> = {};
    for (const c of companies) {
      if (only && c.id !== only) continue;
      const prev = previous.get(c.id) ?? null;
      const cur = c.score as ScoreSnapshot | null;
      const newContacts = prev && cur ? (added.get(c.id) ?? []).filter(k => k.created_at > prev.assessed_at && k.created_at <= cur.assessed_at) : [];
      const explanation = explainDelta({ currentRank: ranks.get(c.id), previousRank: before[c.id], current: cur, previous: prev, newContacts });
      if (explanation) out[c.id] = explanation;
    }
    return out;
  } catch {
    return {};
  }
}
