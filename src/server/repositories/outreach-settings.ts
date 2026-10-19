import "server-only";
import { database } from "@/server/db";
import { requirePageSession } from "@/server/auth/session";
import { defaultSettings, resolveSettings, type OutreachSettings } from "@/domain/outreach/customization";

export type SettingsState = { settings: OutreachSettings; updated_at: string | null; notice?: string };

// Saved settings with defaults filled in. If the table is missing or unreadable the defaults are used and the reason is returned.
export async function fetchSettings(): Promise<SettingsState> {
  try {
    const { data, error } = await database().from("outreach_settings").select("settings, updated_at").eq("id", "default").maybeSingle();
    if (error) throw error;
    if (!data) return { settings: defaultSettings, updated_at: null };
    const { settings, error: invalid } = resolveSettings(data.settings);
    return { settings, updated_at: data.updated_at, notice: invalid && `Saved settings could not be read (${invalid}) so the defaults are shown. Saving will replace them.` };
  } catch {
    return { settings: defaultSettings, updated_at: null, notice: "Could not load saved settings. Showing the defaults; check the database connection and that the outreach settings migration has been applied." };
  }
}

export async function getSettings(): Promise<SettingsState> {
  await requirePageSession();
  return fetchSettings();
}
