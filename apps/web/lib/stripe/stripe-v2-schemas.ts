import * as z from "zod/v4";

export const createRecipientAccountInputSchema = z.object({
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

export const createRecipientAccountOutputSchema = z.object({
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

export const createAccountLinkOutputSchema = z.object({
  url: z.string(),
  expires_at: z.union([z.number(), z.string()]),
  livemode: z.boolean(),
});

export const createOutboundPaymentInputSchema = z.object({
  amount: z.object({
    currency: z.string(),
    value: z.number(),
  }),
  from: z.object({
    financial_account: z.string(),
    currency: z.string(),
  }),
  to: z.object({
    recipient: z.string(),
    payout_method: z.string().optional(),
    currency: z.string().optional(),
  }),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  delivery_options: z
    .object({
      bank_account: z.enum(["automatic", "local", "wire"]).optional(),
    })
    .optional(),
  recipient_notification: z
    .object({
      setting: z.enum(["configured", "none"]),
    })
    .optional(),
});

export const createOutboundPaymentOutputSchema = z.object({
  id: z.string(),
  object: z.literal("v2.money_management.outbound_payment"),
  amount: z.object({
    currency: z.string(),
    value: z.number(),
  }),
  status: z.enum(["processing", "failed", "posted", "returned", "canceled"]),
  from: z.object({
    financial_account: z.string(),
    debited: z
      .object({
        currency: z.string(),
        value: z.number(),
      })
      .optional(),
  }),
  to: z.object({
    recipient: z.string(),
    payout_method: z.string().optional(),
    credited: z
      .object({
        currency: z.string(),
        value: z.number(),
      })
      .optional(),
  }),
  cancelable: z.boolean(),
  description: z.string().nullable().optional(),
  created: z.string(),
  livemode: z.boolean(),
});

export const listPayoutMethodsQuerySchema = z.object({
  limit: z.number(),
  "usage_status[payments]": z.enum(["eligible", "invalid", "requires_action"]),
});

export const listPayoutMethodsOutputSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["bank_account", "card", "crypto_wallet"]),
    }),
  ),
});
