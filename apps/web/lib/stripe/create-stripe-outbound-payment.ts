import type { Partner } from "@dub/prisma/client";
import { getStripePayoutMethods } from "./get-stripe-payout-methods";
import { stripeV2Fetch } from "./stripe-v2-client";

export interface CreateOutboundPaymentParams {
  partner: Pick<Partner, "stripeRecipientId">;
  amount: {
    value: number;
    currency: string;
  };
  description?: string;
  metadata?: Record<string, string>;
}

export async function createStripeOutboundPayment({
  partner,
  amount,
  description,
  metadata,
}: CreateOutboundPaymentParams) {
  const financialAccountId = process.env.STRIPE_FINANCIAL_ACCOUNT_ID;

  if (!financialAccountId) {
    throw new Error("STRIPE_FINANCIAL_ACCOUNT_ID is not configured.");
  }

  if (!partner.stripeRecipientId) {
    throw new Error("Partner does not have a Stripe recipient account.");
  }

  const payoutMethods = await getStripePayoutMethods(partner);

  if (payoutMethods.length === 0) {
    throw new Error("Partner has no payout methods configured.");
  }

  const payoutMethodId = payoutMethods[0].id;

  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/outbound_payments",
    {
      body: {
        amount: {
          currency: amount.currency.toLowerCase(),
          value: amount.value,
        },
        from: {
          financial_account: financialAccountId,
          currency: amount.currency.toLowerCase(),
        },
        to: {
          recipient: partner.stripeRecipientId,
          payout_method: payoutMethodId,
          currency: amount.currency.toLowerCase(),
        },
        ...(description && { description }),
        ...(metadata && { metadata }),
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
