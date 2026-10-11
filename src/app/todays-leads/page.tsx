import { requirePageSession } from "@/server/auth/session";
import { getTodaysLeads } from "@/server/repositories/todays-leads";
import { TodaysLeads } from "@/features/todays-leads/todays-leads";

export const dynamic = "force-dynamic";
export default async function TodaysLeadsPage() {
  await requirePageSession();
  const { leads, error } = await getTodaysLeads();
  return <TodaysLeads leads={leads} error={error} />;
}
