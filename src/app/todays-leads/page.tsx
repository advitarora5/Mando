import { requirePageSession } from "@/server/auth/session";
import { getTodaysLeads } from "@/server/repositories/todays-leads";
import { TodaysLeads } from "@/features/todays-leads/todays-leads";
import { AppShell, paletteCompanies } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export default async function TodaysLeadsPage() {
  await requirePageSession();
  const { leads, error } = await getTodaysLeads();
  return <AppShell active="leads" companies={paletteCompanies(leads)}>
    <TodaysLeads leads={leads} error={error} />
  </AppShell>;
}
