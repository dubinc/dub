import { redirect } from "next/navigation";

// Handles old customer IDs (pre cus_ prefix) by redirecting to the sales page
export default async function ProgramCustomerPage({
  params,
}: {
  params: Promise<{ slug: string; customerId: string }>;
}) {
  const { slug, customerId } = await params;
  redirect(`/${slug}/program/customers/${customerId}/sales`);

  return null;
}
