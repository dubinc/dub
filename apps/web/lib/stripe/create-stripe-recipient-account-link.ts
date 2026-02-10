import { Partner } from "@dub/prisma/client";
import { PARTNERS_DOMAIN } from "@dub/utils";
import { stripeV2Fetch } from "./stripe-v2-client";

interface CreateStripeRecipientAccountLinkParams {
  useCase: "account_onboarding" | "account_update";
  partner: Pick<Partner, "id" | "stripeRecipientId">;
}

export async function createStripeRecipientAccountLink({
  partner,
  useCase,
}: CreateStripeRecipientAccountLinkParams) {
  if (!partner.stripeRecipientId) {
    throw new Error("Partner does not have a Stripe recipient account ID.");
  }

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
      account: partner.stripeRecipientId,
      use_case: useCaseConfig,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
