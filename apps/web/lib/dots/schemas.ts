import z from "../zod";

export const dotsFlowStepsSchema = z.enum([
  "compliance",
  "manage-payments",
  "manage-payouts",
  "payout",
  "payment",
  "id-verification",
  "redirect",
  "credit-card-payment",
  "background-check",
]);

export const dotsPayoutPlatforms = z.enum([
  "ach",
  "paypal",
  "venmo",
  "cash_app",
  "intl_transfer",
  "airtm",
  "payoneer",
]);

export const addBankAccountSchema = z.object({
  accountNumber: z.string().min(1),
  routingNumber: z.string().min(1),
  accountType: z.enum(["checking", "savings"]).default("checking"),
});

export const depositFundsSchema = z.object({
  amount: z.string().refine((amount) => {
    const value = parseFloat(amount);
    return !isNaN(value) && value >= 0.01 && value <= 100_000;
  }),
});

export const dotsAppSchema = z.object({
  id: z.string(),
  status: z.string(),
  metrics: z.object({
    connected_users: z.number(),
    money_out: z.string(),
    wallet_balance: z.string(),
  }),
});

const dotsTransferSchema = z.object({
  id: z.string(),
  created: z.string(),
  status: z.enum([
    "created",
    "pending",
    "failed",
    "completed",
    "reversed",
    "canceled",
    "flagged",
  ]),
  type: z.enum(["refill", "payout", "balance"]),
  amount: z.string(),
  external_data: z.any(),
  transactions: z.array(z.any()),
});

export const dotsTransfersSchema = z.object({
  data: z.array(dotsTransferSchema),
  has_more: z.boolean(),
});

export const dotsWithdrawalSchema = dotsTransferSchema
  .pick({
    id: true,
    created: true,
    status: true,
    amount: true,
  })
  .extend({
    platform: dotsPayoutPlatforms,
    fee: z.string(),
  });

export const dotsWithdrawalsSchema = z.object({
  data: z.array(dotsWithdrawalSchema),
  has_more: z.boolean(),
});

export const dotsDepositSchema = dotsWithdrawalSchema.omit({
  fee: true,
});

export const dotsDepositsSchema = z.object({
  data: z.array(dotsDepositSchema),
  has_more: z.boolean(),
});

export const payoutMethodSchema = z.object({
  platform: dotsPayoutPlatforms,
  default: z.boolean().default(false),
  id: z.string().optional(),
  country: z.string().optional(),
});

export const dotsUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  phone_number: z.object({
    country_code: z.string(),
    phone_number: z.string(),
  }),
  status: z.enum(["verified", "unverified", "disabled", "in_review"]),
  verified: z.boolean(),
  wallet: z.object({
    withdrawable_amount: z.number(),
    pending_amount: z.number(),
  }),
  default_payout_method: dotsPayoutPlatforms.nullable(),
  payout_methods: z.array(payoutMethodSchema),
  compliance: z.any(),
});
