"use server";

import { requireSession } from "@/server/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { database } from "@/server/db";
import { fillTemplate, toCustomization } from "@/domain/outreach/customization";
import { buildDraftPrompt, parseDrafts, pickTrigger } from "@/domain/outreach/draft";
import { completeJson } from "@/server/outreach-llm";
import { fetchSettings } from "@/server/repositories/outreach-settings";

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
    if (sent) {
      // Best-effort roll-up: advance a queued lead to contacted on first send. The durable
      // send record is outreach_drafts.sent_at; lead status and its dates stay owned by the
      // lead-status action, so this never overrides a lead already replied or demo booked.
      await database().from("companies").update({ lead_status: "contacted", contacted_at: new Date().toISOString() }).eq("id", company_id).eq("lead_status", "queued");
    }
    revalidatePath(`/companies/${company_id}`);
    return { saved: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map(issue => issue.message).join(" ") };
    return { error: error instanceof Error ? error.message : "Save failed. Please try again." };
  }
}

const createSchema = z.object({ contact_id: z.uuid(), company_id: z.uuid(), channel: z.enum(["email", "linkedin"]) });

// Starts a hand-written draft with a greeting so the rep only has to fill in the message.
export async function createDraft(input: { contact_id: string; company_id: string; channel: "email" | "linkedin" }): Promise<DraftResult> {
  try {
    await requireSession();
    const { contact_id, company_id, channel } = createSchema.parse(input);
    const db = database();
    const { data: contact } = await db.from("contacts").select("name, companies(name)").eq("id", contact_id).eq("company_id", company_id).maybeSingle();
    if (!contact) throw new Error("Contact not found. Refresh and try again.");
    const { settings } = await fetchSettings();
    const company = Array.isArray(contact.companies) ? contact.companies[0] : contact.companies;
    const values = { first_name: contact.name.trim().split(/\s+/)[0], company: company?.name ?? "", sign_off: settings.sign_off };
    const body = fillTemplate(channel === "email" ? settings.email_template : settings.linkedin_template, values) || `Hi ${values.first_name}, `;
    const { error } = await db.from("outreach_drafts").insert({ contact_id, company_id, channel, subject: null, body, trigger: "manual", edited: true });
    if (error?.code === "23505") throw new Error("A draft for this channel already exists. Refresh the page.");
    if (error) throw new Error("Could not create the draft. Check that the outreach migration has been applied.");
    revalidatePath(`/companies/${company_id}`);
    return { saved: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Invalid draft request." };
    return { error: error instanceof Error ? error.message : "Could not create the draft." };
  }
}

const generateSchema = z.object({ contact_id: z.uuid(), company_id: z.uuid() });

// Writes the email and LinkedIn drafts with the model, from the stored evidence and the saved customization.
// Only channels without a draft are filled, so hand-edited and sent drafts are never replaced.
export async function generateDrafts(input: { contact_id: string; company_id: string }): Promise<DraftResult> {
  try {
    await requireSession();
    const { contact_id, company_id } = generateSchema.parse(input);
    const db = database();
    const { data: contact } = await db.from("contacts").select("id, name, title, outreach_drafts(channel)").eq("id", contact_id).eq("company_id", company_id).maybeSingle();
    if (!contact) throw new Error("Contact not found. Refresh and try again.");
    const missing = (["email", "linkedin"] as const).filter(channel => !(contact.outreach_drafts ?? []).some((d: { channel: string }) => d.channel === channel));
    if (!missing.length) throw new Error("This contact already has both drafts.");

    const { data: row } = await db.from("companies").select("*, scores(*), company_insights(why_now_generated, why_now_override)").eq("id", company_id).maybeSingle();
    if (!row) throw new Error("Company not found. Refresh and try again.");
    const score = [...(row.scores ?? [])].sort((a: { assessed_at: string }, b: { assessed_at: string }) => b.assessed_at.localeCompare(a.assessed_at))[0];
    if (!score) throw new Error("This company has no saved score yet, so there is no evidence to draft from.");
    const insight = [row.company_insights].flat()[0];
    const company = { name: row.name, industry: row.industry, workday_signal_date: row.workday_signal_date, score, why_now: insight?.why_now_override ?? insight?.why_now_generated ?? null };

    const custom = toCustomization((await fetchSettings()).settings);
    const trigger = pickTrigger(company, Date.now(), custom.limits.goLiveDays);
    const drafts = parseDrafts(await completeJson(buildDraftPrompt(company, contact, trigger, custom)), custom.limits.emailWords).filter(d => missing.includes(d.channel));
    const { error } = await db.from("outreach_drafts").insert(drafts.map(d => ({ contact_id, company_id, channel: d.channel, subject: d.subject, body: d.body, trigger, edited: false })));
    if (error?.code === "23505") throw new Error("A draft was created in the meantime. Refresh the page.");
    if (error) throw new Error("Could not save the drafts. Check that the outreach migration has been applied.");
    revalidatePath(`/companies/${company_id}`);
    return { saved: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Invalid draft request." };
    return { error: error instanceof Error ? error.message : "Could not generate the drafts." };
  }
}

const deleteSchema = z.object({ id: z.uuid(), company_id: z.uuid() });

// Removes one draft so it can be regenerated or rewritten. Sent history for that draft goes with it.
export async function deleteDraft(input: { id: string; company_id: string }): Promise<DraftResult> {
  try {
    await requireSession();
    const { id, company_id } = deleteSchema.parse(input);
    const { data, error } = await database().from("outreach_drafts").delete().eq("id", id).eq("company_id", company_id).select("id");
    if (error) throw new Error("Could not delete this draft. Please try again.");
    if (!data?.length) throw new Error("This draft was already deleted. Refresh the page.");
    revalidatePath(`/companies/${company_id}`);
    return { saved: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Invalid delete request." };
    return { error: error instanceof Error ? error.message : "Could not delete the draft." };
  }
}

export async function saveDraft(input: { id: string; company_id: string; subject: string; body: string }) { return update(input, false); }
// Called when the rep clicks send: saves the final wording and marks the draft sent.
export async function markDraftSent(input: { id: string; company_id: string; subject: string; body: string }) { return update(input, true); }
