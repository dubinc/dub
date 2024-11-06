import z from "../zod";

const dotsTransactionSchema = z.object({
  id: z.number(),
  amount: z.string(),
  destination_name: z.string(),
  source_name: z.string(),
  type: z.string(),
  created: z.string(),
});

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

export const dotsTransactionsSchema = z.object({
  data: z.array(dotsTransactionSchema),
  has_more: z.boolean(),
});
