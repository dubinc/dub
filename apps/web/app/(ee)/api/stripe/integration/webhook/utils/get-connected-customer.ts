import { stripeAppClient } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";

export async function getConnectedCustomer({
  stripeCustomerId,
  stripeAccountId,
  mode,
}: {
  stripeCustomerId?: string | null;
  stripeAccountId?: string | null;
  mode: StripeMode;
}) {
  // if stripeCustomerId or stripeAccountId is not provided, return null
  if (!stripeCustomerId || !stripeAccountId) {
    return null;
  }

  const connectedCustomer = await stripeAppClient({
    mode,
  }).customers.retrieve(stripeCustomerId, {
    stripeAccount: stripeAccountId,
  });

  if (connectedCustomer.deleted) {
    return null;
  }

  return connectedCustomer;
}
