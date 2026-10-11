import "server-only";
import { database } from "@/server/db";
import { requirePageSession } from "@/server/auth/session";
import type { Channel } from "@/domain/outreach/draft";

export type StoredDraft = { id: string; contact_id: string; channel: Channel; subject: string | null; body: string; trigger: string; edited: boolean; sent_at: string | null };

// Optional context: if the table is missing or the query fails, the company page still loads without drafts.
export async function getDrafts(companyId: string): Promise<StoredDraft[]> {
  await requirePageSession();
  try {
    const { data, error } = await database().from("outreach_drafts").select("id, contact_id, channel, subject, body, trigger, edited, sent_at").eq("company_id", companyId);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
