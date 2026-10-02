import { prisma } from "@/lib/prisma";

export async function updateCustomerWithStripeCustomerId({
  workspaceId,
  dubCustomerExternalId,
  stripeCustomerId,
}: {
  workspaceId: string;
  dubCustomerExternalId: string;
  stripeCustomerId?: string | null;
}) {
  // if stripeCustomerId is not provided, return null
  if (!stripeCustomerId) {
    return null;
  }

  try {
    // Update customer with stripeCustomerId if exists – for future events
    // Match on projectId, not projectConnectId. projectConnectId is null for
    // customers that were created before the workspace connected Stripe.
    return await prisma.customer.update({
      where: {
        projectId_externalId: {
          projectId: workspaceId,
          externalId: dubCustomerExternalId,
        },
      },
      data: {
        stripeCustomerId,
      },
    });
  } catch (error) {
    // Skip if customer not found (not an error, just a case where the customer doesn't exist on Dub yet)
    console.log("Failed to update customer with StripeCustomerId:", error);
    return null;
  }
}
