import z from "../zod";

export const dotsAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});

export const addBankAccountSchema = z.object({
  accountNumber: z.string().min(1),
  routingNumber: z.string().min(1),
  accountType: z.enum(["checking", "savings"]).default("checking"),
});

export const achAccountSchema = z.object({
  name: z.string(),
  mask: z.string(),
});
