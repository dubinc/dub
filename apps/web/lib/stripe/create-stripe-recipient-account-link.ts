import { PARTNERS_DOMAIN } from "@dub/utils";
import { stripeV2Fetch } from "./stripe-v2-client";

interface CreateStripeRecipientAccountLinkParams {
  stripeRecipientId: string;
  useCase: "account_onboarding" | "account_update";
}

export async function createStripeRecipientAccountLink({
  stripeRecipientId,
  useCase,
}: CreateStripeRecipientAccountLinkParams) {
  const { data, error } = await stripeV2Fetch("/v2/core/account_links", {
    body: {
      account: stripeRecipientId,
      use_case: {
        type: useCase,
        [useCase]: {
          configurations: ["recipient"],
          return_url: `${PARTNERS_DOMAIN}/payouts?settings=true`,
          refresh_url: `${PARTNERS_DOMAIN}/payouts?settings=true`,
          collection_options: {
            fields: "eventually_due",
          },
        },
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
