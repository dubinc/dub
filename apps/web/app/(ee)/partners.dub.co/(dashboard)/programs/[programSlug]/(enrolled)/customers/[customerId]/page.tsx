import { redirect } from "next/navigation";
import { ProgramCustomerPageClient } from "./page-client";

export default async function PartnerProgramCustomerPage({
  params,
}: {
  params: Promise<{ programSlug: string; customerId: string }>;
}) {
  const { programSlug, customerId } = await params;

  if (customerId === "referrals") {
    redirect(`/programs/${programSlug}/customers/leads`);
  }
  return <ProgramCustomerPageClient />;
}
