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
  const returnUrl = `${PARTNERS_DOMAIN}/payouts`;
  const refreshUrl = `${PARTNERS_DOMAIN}/payouts`;

  const useCaseConfig =
    useCase === "account_onboarding"
      ? {
          type: "account_onboarding" as const,
          account_onboarding: {
            configurations: ["recipient" as const],
            return_url: returnUrl,
            refresh_url: refreshUrl,
          },
        }
      : {
          type: "account_update" as const,
          account_update: {
            configurations: ["recipient" as const],
            return_url: returnUrl,
            refresh_url: refreshUrl,
          },
        };

  const { data, error } = await stripeV2Fetch("/v2/core/account_links", {
    body: {
      account: stripeRecipientId,
      use_case: useCaseConfig,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
