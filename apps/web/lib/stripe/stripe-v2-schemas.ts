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
        collection_options: z.object({
          fields: z.enum(["currently_due", "eventually_due"]),
        }),
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

export const outboundPaymentSchema = z.object({
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
  status_details: z
    .object({
      failed: z
        .object({
          reason: z.string(),
        })
        .optional(),
      returned: z
        .object({
          reason: z.string(),
        })
        .optional(),
    })
    .nullable()
    .optional(),
  trace_id: z
    .object({
      value: z.string(),
    })
    .nullable()
    .optional(),
});

export const listPayoutMethodsQuerySchema = z.object({
  limit: z.number(),
});

export const listPayoutMethodsOutputSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      object: z.string(),
      type: z.enum(["crypto_wallet"]),
      crypto_wallet: z
        .object({
          address: z.string(),
          archived: z.boolean(),
          network: z.string(),
        })
        .nullable(),
    }),
  ),
});

export const retrieveAccountQuerySchema = z.object({
  "include[0]": z.string(),
});

export const retrieveAccountOutputSchema = z.object({
  id: z.string(),
  closed: z.boolean().nullable().optional(),
  configuration: z
    .object({
      recipient: z
        .object({
          applied: z.boolean(),
          capabilities: z.record(z.string(), z.any()).nullable(),
        })
        .nullable(),
    })
    .nullable(),
});

export const createPayoutInputSchema = z.object({
  amount: z.number(),
  currency: z.literal("usd"),
  payout_method: z.string(),
});

export const createPayoutOutputSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "paid", "in_transit", "canceled", "failed"]),
});

export const OUTBOUND_PAYMENT_FAILURE_REASONS = {
  payout_method_declined:
    "The outbound flow to this payout method was declined.",
  payout_method_does_not_exist:
    "Payout method used for this outbound flow does not exist.",
  payout_method_expired: "Payout method used for this outbound flow expired.",
  payout_method_unsupported:
    "Payout method used for this outbound flow is unsupported.",
  payout_method_usage_frequency_limit_exceeded:
    "The usage frequency limit for this payout method was exceeded.",
  unknown_failure: "Unknown failure",
} as const;
