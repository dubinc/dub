import { redirect } from "next/navigation";

// Handles old customer IDs (pre cus_ prefix) by redirecting to the sales page
export default async function ProgramCustomerPage({
  params,
}: {
  params: Promise<{ slug: string; customerId: string }>;
}) {
  const { slug, customerId } = await params;
  if (customerId === "referrals") {
    redirect(`/${slug}/program/customers/leads`);
  }

  redirect(`/${slug}/program/customers/${customerId}/sales`);

  return null;
}
