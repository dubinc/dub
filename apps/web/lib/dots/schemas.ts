import z from "../zod";

export const addBankAccountSchema = z.object({
  accountNumber: z.string().min(1),
  routingNumber: z.string().min(1),
  accountType: z.enum(["checking", "savings"]).default("checking"),
});
