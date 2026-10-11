"use server";

import { requireSession } from "@/server/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { database } from "@/server/db";

export type DraftResult = { error?: string; saved?: boolean };
const draftSchema = z.object({
  id: z.uuid(), company_id: z.uuid(),
  subject: z.string().trim().max(300).transform(v => v || null),
  body: z.string().trim().min(1, "Message cannot be empty.").max(4000),
});

async function update(input: unknown, sent: boolean): Promise<DraftResult> {
  try {
    await requireSession();
    const { id, company_id, subject, body } = draftSchema.parse(input);
    const values = { subject, body, edited: true, ...(sent ? { sent_at: new Date().toISOString() } : {}) };
    const { data, error } = await database().from("outreach_drafts").update(values).eq("id", id).eq("company_id", company_id).select("id");
    if (error || !data?.length) throw new Error("Could not save this message. Refresh and try again.");
    revalidatePath(`/companies/${company_id}`);
    return { saved: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map(issue => issue.message).join(" ") };
    return { error: error instanceof Error ? error.message : "Save failed. Please try again." };
  }
}

export async function saveDraft(input: { id: string; company_id: string; subject: string; body: string }) { return update(input, false); }
// Called when the rep clicks send: saves the final wording and marks the draft sent.
export async function markDraftSent(input: { id: string; company_id: string; subject: string; body: string }) { return update(input, true); }
