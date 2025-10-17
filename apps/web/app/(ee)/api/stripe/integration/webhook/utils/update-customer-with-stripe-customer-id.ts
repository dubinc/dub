import { prisma } from "@dub/prisma";

export async function updateCustomerWithStripeCustomerId({
  stripeAccountId,
  dubCustomerExternalId,
  stripeCustomerId,
}: {
  stripeAccountId?: string | null;
  dubCustomerExternalId: string;
  stripeCustomerId?: string | null;
}) {
  // if stripeCustomerId or stripeAccountId is not provided, return null
  // (same logic as in getConnectedCustomer)
  if (!stripeCustomerId || !stripeAccountId) {
    return null;
  }

  try {
    // Update customer with stripeCustomerId if exists – for future events
    return await prisma.customer.update({
      where: {
        projectConnectId_externalId: {
          projectConnectId: stripeAccountId,
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
