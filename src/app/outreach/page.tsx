import { getCompanies } from "@/server/repositories/companies";
import { AppShell, paletteCompanies } from "@/components/app-shell";
import { OutreachQueue } from "@/features/outreach/queue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Outreach queue | Mando" };
export default async function OutreachPage() {
  const { companies, error } = await getCompanies();
  return <AppShell active="outreach" companies={paletteCompanies(companies)}>
    {error ? <div className="empty-state" role="alert"><strong>Could not load contacts</strong><span>{error}</span></div> : <OutreachQueue companies={companies} />}
  </AppShell>;
}
