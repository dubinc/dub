import { prisma } from "@/lib/prisma";

// Find the customer that owns the Stripe customer ID, then fall back to email.
// A single findFirst with OR can return the email match while another customer
// owns the Stripe customer ID. Setting the Stripe customer ID on the email match
// then fails with P2002 after the sale is recorded.
export async function findCustomerByStripeCustomerIdOrEmail({
  workspaceId,
  stripeCustomerId,
  email,
}: {
  workspaceId: string;
  stripeCustomerId: string;
  email?: string | null;
}) {
  const customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  if (customer || !email) {
    return customer;
  }

  return await prisma.customer.findFirst({
    where: {
      projectId: workspaceId,
      email,
    },
  });
}
