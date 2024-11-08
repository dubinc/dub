import z from "../zod";

const dotsTransferSchema = z.object({
  id: z.string(),
  amount: z.string(),
  type: z.enum(["refill", "payout", "balance"]),
  status: z.enum([
    "created",
    "pending",
    "failed",
    "completed",
    "reversed",
    "canceled",
    "flagged",
  ]),
  created: z.string(),
});

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

export const dotsTransfersSchema = z.object({
  data: z.array(dotsTransferSchema),
  has_more: z.boolean(),
});

export const dotsPayoutPlatforms = z.enum([
  "ach",
  "paypal",
  "venmo",
  "cash_app",
  "intl_transfer",
  "airtm",
  "payoneer",
]);

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
  default_payout_method: dotsPayoutPlatforms,
  payout_methods: z.array(
    z.object({
      platform: dotsPayoutPlatforms,
      default: z.boolean().default(false),
    }),
  ),
  compliance: z.any(),
});
