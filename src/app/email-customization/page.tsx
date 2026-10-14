import Link from "next/link";
import { LogoutButton } from "@/features/login/logout";
import { SettingsForm } from "@/features/outreach/settings-form";
import { getSettings } from "@/server/repositories/outreach-settings";

export const metadata = { title: "Email customization | Mando" };
export const dynamic = "force-dynamic";

export default async function EmailCustomizationPage() {
  const { settings, updated_at, notice } = await getSettings();
  return <main>
    <header><Link href="/">mando <span>/ prospect intelligence</span></Link><LogoutButton /></header>
    <nav className="breadcrumb"><Link href="/">Dashboard</Link> / Email customization</nav>
    <section className="intro"><p className="eyebrow">OUTREACH</p><h1>Email customization</h1><p>Everything that shapes drafted messages: what Mando offers, the angle for each situation, voice, templates and limits. Edits are shared and used by the drafting script and the Write buttons.</p></section>
    {notice && <aside role="status">{notice}</aside>}
    {!updated_at && !notice && <aside>Showing the built-in defaults. Nothing has been saved yet.</aside>}
    <SettingsForm settings={settings} updatedAt={updated_at} />
    <footer>Regenerate drafts after editing: <code>npm run drafts -- --only=&quot;Company&quot; --force</code>. Hand-edited and sent drafts are never overwritten.</footer>
  </main>;
}
