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

export const createAccountLinkInputSchema = z.object({
  account: z.string(),
  use_case: z.object({
    type: z.enum(["account_onboarding", "account_update"]),
    account_onboarding: z
      .object({
        configurations: z.array(z.literal("recipient")),
        refresh_url: z.url(),
        return_url: z.url().optional(),
      })
      .optional(),
    account_update: z
      .object({
        configurations: z.array(z.literal("recipient")),
        refresh_url: z.url(),
        return_url: z.url().optional(),
      })
      .optional(),
  }),
});

const createAccountLinkOutputSchema = z.object({
  url: z.string(),
  expires_at: z.union([z.number(), z.string()]),
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
      "/v2/core/account_links": {
        method: "post",
        input: createAccountLinkInputSchema,
        output: createAccountLinkOutputSchema,
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
