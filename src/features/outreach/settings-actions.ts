"use server";

import { requireSession } from "@/server/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { database } from "@/server/db";
import { settingsSchema } from "@/domain/outreach/customization";

export type SettingsSaveState = { error?: string; saved?: boolean };
const numberFields = ["email_max_words", "subject_max_words", "go_live_window_days"] as const;

export async function saveSettings(_: SettingsSaveState, form: FormData): Promise<SettingsSaveState> {
  try {
    await requireSession();
    const raw = Object.fromEntries(form);
    const updatedAt = typeof raw.updated_at === "string" ? raw.updated_at : "";
    const values: Record<string, unknown> = { ...raw };
    delete values.updated_at;
    for (const field of numberFields) values[field] = typeof raw[field] === "string" && raw[field].trim() !== "" ? Number(raw[field]) : NaN;
    const settings = settingsSchema.parse(values);

    const db = database();
    if (!updatedAt) {
      const { error } = await db.from("outreach_settings").insert({ id: "default", settings });
      if (error?.code === "23505") throw new Error("Someone else saved first. Refresh the page and re-apply your changes.");
      if (error) throw new Error("Could not save. Check that the outreach settings migration has been applied.");
    } else {
      // Only update the version this page was loaded from, so a concurrent edit is never overwritten silently.
      const { data, error } = await db.from("outreach_settings").update({ settings }).eq("id", "default").eq("updated_at", updatedAt).select("id");
      if (error) throw new Error("Could not save. Please try again.");
      if (!data?.length) throw new Error("Someone else saved these settings since you opened the page. Refresh and re-apply your changes.");
    }
    revalidatePath("/email-customization");
    return { saved: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map(i => i.message.startsWith("Invalid input") ? `${i.path.join(".")}: ${i.message}` : i.message).join(" ") };
    return { error: error instanceof Error ? error.message : "Save failed. Please try again." };
  }
}
