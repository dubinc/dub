import { createFetch, createSchema } from "@better-fetch/fetch";
import { prettyPrint } from "@dub/utils";
import {
  createAccountLinkInputSchema,
  createAccountLinkOutputSchema,
  createOutboundPaymentInputSchema,
  createOutboundPaymentOutputSchema,
  createRecipientAccountInputSchema,
  createRecipientAccountOutputSchema,
  listOutboundSetupIntentsOutputSchema,
  listOutboundSetupIntentsQuerySchema,
} from "./stripe-v2-schemas";

export const STRIPE_API_VERSION = "2025-09-30.preview";

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
      "/v2/core/account_links": {
        method: "post",
        input: createAccountLinkInputSchema,
        output: createAccountLinkOutputSchema,
      },
      "/v2/money_management/outbound_payments": {
        method: "post",
        input: createOutboundPaymentInputSchema,
        output: createOutboundPaymentOutputSchema,
      },
      "/v2/money_management/outbound_setup_intents": {
        method: "get",
        query: listOutboundSetupIntentsQuerySchema,
        output: listOutboundSetupIntentsOutputSchema,
      },
    },
    {
      strict: true,
    },
  ),
  onError: ({ error }) => {
    console.error("[Stripe V2] Error", prettyPrint(error));
  },
});
