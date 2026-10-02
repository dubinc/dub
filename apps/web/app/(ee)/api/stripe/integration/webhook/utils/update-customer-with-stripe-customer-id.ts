import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
    // or if another customer already has this stripeCustomerId.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2002")
    ) {
      console.log("Failed to update customer with StripeCustomerId:", error);
      return null;
    }

    // Throw other errors (e.g. a database timeout) so that Stripe retries the event.
    // Otherwise the caller falls back to promo code attribution and can create a duplicate customer.
    throw error;
  }
}
