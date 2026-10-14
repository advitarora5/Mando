import Link from "next/link";
import { AppShell, paletteCompanies } from "@/components/app-shell";
import { SettingsForm } from "@/features/outreach/settings-form";
import { getCompanies } from "@/server/repositories/companies";
import { getSettings } from "@/server/repositories/outreach-settings";

export const metadata = { title: "Email customization | Mando" };
export const dynamic = "force-dynamic";

export default async function EmailCustomizationPage() {
  const [{ companies }, { settings, updated_at, notice }] = await Promise.all([getCompanies(), getSettings()]);
  return <AppShell active="outreach" companies={paletteCompanies(companies)}>
    <div className="settings-page">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/outreach">Outreach</Link> / <span aria-current="page">Email customization</span></nav>
      <h1>Email customization</h1>
      <p className="muted">Everything that shapes drafted messages: what Mando offers, the angle for each situation, voice, templates and limits. Edits are shared and used by the drafting script, Generate with AI and the blank-draft buttons.</p>
      {notice && <p className="active-filters" role="status">{notice}</p>}
      {!updated_at && !notice && <p className="active-filters" role="note">Showing the built-in defaults. Nothing has been saved yet.</p>}
      <SettingsForm settings={settings} updatedAt={updated_at} />
      <p className="muted">Regenerate drafts after editing: <code>npm run drafts -- --only=&quot;Company&quot; --force</code>. Hand-edited and sent drafts are never overwritten.</p>
    </div>
  </AppShell>;
}
