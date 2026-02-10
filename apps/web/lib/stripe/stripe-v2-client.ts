import { createFetch, createSchema } from "@better-fetch/fetch";
import * as z from "zod/v4";

const STRIPE_API_VERSION = "2025-09-30.preview";

const createRecipientAccountInputSchema = z.object({
  contact_email: z.string(),
  display_name: z.string(),
  identity: z.object({
    country: z.string(),
    entity_type: z.enum(["individual", "company"]),
  }),
  configuration: z.object({
    recipient: z.object({
      capabilities: z.object({
        crypto_wallets: z.object({
          requested: z.literal(true),
        }),
      }),
    }),
  }),
  include: z.array(z.string()),
});

const createRecipientAccountOutputSchema = z.object({
  id: z.string(),
  livemode: z.boolean(),
});

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
    },
    {
      strict: true,
    },
  ),
  onError: ({ error }) => {
    console.error("[Stripe V2] Error", error);
  },
});
