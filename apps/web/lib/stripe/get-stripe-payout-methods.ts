import type { Partner } from "@dub/prisma/client";
import { stripeV2Fetch } from "./stripe-v2-client";

export async function getStripePayoutMethods(
  partner: Pick<Partner, "stripeRecipientId">,
) {
  if (!partner.stripeRecipientId) {
    throw new Error("Partner does not have a Stripe recipient account.");
  }

  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/payout_methods",
    {
      query: { limit: 1 },
      headers: {
        "Stripe-Context": JSON.stringify({
          account: partner.stripeRecipientId,
        }),
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data?.data;
}
