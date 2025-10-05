import { stripeAppClient } from "@/lib/stripe";

export async function getConnectedCustomer({
  stripeCustomerId,
  stripeAccountId,
  livemode = true,
}: {
  stripeCustomerId?: string | null;
  stripeAccountId?: string | null;
  livemode?: boolean;
}) {
  // if stripeCustomerId or stripeAccountId is not provided, return null
  if (!stripeCustomerId || !stripeAccountId) {
    return null;
  }

  const connectedCustomer = await stripeAppClient({
    livemode,
  }).customers.retrieve(stripeCustomerId, {
    stripeAccount: stripeAccountId,
  });

  if (connectedCustomer.deleted) {
    return null;
  }

  return connectedCustomer;
}
