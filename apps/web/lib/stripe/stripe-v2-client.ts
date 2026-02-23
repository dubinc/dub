import { createFetch, createSchema } from "@better-fetch/fetch";
import { prettyPrint } from "@dub/utils";
import {
  createAccountLinkInputSchema,
  createAccountLinkOutputSchema,
  createOutboundPaymentInputSchema,
  createPayoutInputSchema,
  createPayoutOutputSchema,
  createRecipientAccountInputSchema,
  createRecipientAccountOutputSchema,
  listPayoutMethodsOutputSchema,
  listPayoutMethodsQuerySchema,
  outboundPaymentSchema,
  retrieveAccountOutputSchema,
  retrieveAccountQuerySchema,
} from "./stripe-v2-schemas";

export const STRIPE_API_VERSION = "2025-09-30.preview";

// TODO:
// Replace this with new Stripe SDK when it becomes stable

export const stripeV2Fetch = createFetch({
  baseURL: "https://api.stripe.com",
  headers: {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    "Stripe-Version": STRIPE_API_VERSION,
  },
  schema: createSchema(
    {
      "/v2/core/accounts": {
        method: "post",
        input: createRecipientAccountInputSchema,
        output: createRecipientAccountOutputSchema,
      },
      "/v2/core/accounts/:id": {
        method: "get",
        query: retrieveAccountQuerySchema,
        output: retrieveAccountOutputSchema,
      },
      "/v2/core/account_links": {
        method: "post",
        input: createAccountLinkInputSchema,
        output: createAccountLinkOutputSchema,
      },
      "/v2/money_management/outbound_payments": {
        method: "post",
        input: createOutboundPaymentInputSchema,
        output: outboundPaymentSchema,
      },
      "/v2/money_management/outbound_payments/:id": {
        method: "get",
        output: outboundPaymentSchema,
      },
      "/v2/money_management/payout_methods": {
        method: "get",
        query: listPayoutMethodsQuerySchema,
        output: listPayoutMethodsOutputSchema,
      },
      // payout_method is a preview feature and not currently available in our current SDK version
      "/v1/payouts": {
        method: "post",
        input: createPayoutInputSchema,
        output: createPayoutOutputSchema,
      },
    },
    {
      strict: true,
    },
  ),
  onResponse: async (context) => {
    const cloned = context.response.clone();

    try {
      const raw = await cloned.json();
      console.log("[Stripe V2] Raw response", prettyPrint(raw));
    } catch {
      //
    }

    return context.response;
  },
  onError: ({ error }) => {
    console.error("[Stripe V2] Error", prettyPrint(error));
  },
});
