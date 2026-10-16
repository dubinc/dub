import { prisma } from "@/lib/prisma";

// Find the customer that owns the Stripe customer ID.
// The customers API lets any workspace set any stripeCustomerId, so the owner
// can be in another workspace. In that case, do not use the Stripe customer ID
// to find or update customers in this workspace.
export async function getStripeCustomerOwner({
  workspaceId,
  stripeCustomerId,
}: {
  workspaceId: string;
  stripeCustomerId?: string | null;
}) {
  if (!stripeCustomerId) {
    return {
      stripeCustomerOwner: null,
      linkableStripeCustomerId: null,
    };
  }

  const customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  if (customer && customer.projectId !== workspaceId) {
    return {
      stripeCustomerOwner: null,
      linkableStripeCustomerId: null,
    };
  }

  return {
    stripeCustomerOwner: customer,
    linkableStripeCustomerId: stripeCustomerId,
  };
}
