import z from "@/lib/zod";

export const createReferralTokenSchema = z.object({
  linkId: z.string().min(1),
});

export const referralTokenSchema = z.object({
  publicToken: z.string(),
  expires: z.date(),
});
