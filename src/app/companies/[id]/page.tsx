import { requirePageSession } from "@/server/auth/session";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getCompanyDetail } from "@/server/repositories/company-detail";
import { getSnapshots } from "@/server/repositories/rank-history";
import { getDrafts } from "@/server/repositories/outreach-drafts";
import { Detail } from "@/features/company-detail/detail";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI draft generation runs as a server action on this page
export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const company = await getCompanyDetail(id);
  if (!company) notFound();
  return <Detail company={company} snapshots={await getSnapshots(id)} drafts={await getDrafts(id)} />;
}
