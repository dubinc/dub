import type { Partner } from "@dub/prisma/client";
import { getStripePayoutMethods } from "./get-stripe-payout-methods";
import { stripeV2Fetch } from "./stripe-v2-client";

export interface CreateStripeOutboundPaymentParams {
  partner: Pick<Partner, "stripeRecipientId">;
  amount: number;
  description: string;
}

export async function createStripeOutboundPayment({
  partner,
  amount,
  description,
}: CreateStripeOutboundPaymentParams) {
  const financialAccountId = process.env.STRIPE_FINANCIAL_ACCOUNT_ID;

  if (!financialAccountId) {
    throw new Error("STRIPE_FINANCIAL_ACCOUNT_ID is not configured.");
  }

  if (!partner.stripeRecipientId) {
    throw new Error("Partner does not have a Stripe recipient account.");
  }

  const payoutMethods = await getStripePayoutMethods({
    stripeRecipientId: partner.stripeRecipientId,
  });

  if (payoutMethods.length === 0) {
    throw new Error("Partner has no payout methods configured.");
  }

  const cryptoPayoutMethod = payoutMethods.find(
    (method) => method.type === "crypto_wallet",
  );

  if (!cryptoPayoutMethod) {
    throw new Error(
      "Partner has no eligible crypto payout methods configured.",
    );
  }

  const { data, error } = await stripeV2Fetch(
    "/v2/money_management/outbound_payments",
    {
      body: {
        from: {
          financial_account: financialAccountId,
          currency: "usd",
        },
        to: {
          recipient: partner.stripeRecipientId,
          payout_method: cryptoPayoutMethod.id,
          currency: "usdc",
        },
        amount: {
          value: amount,
          currency: "usd",
        },
        description,
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
