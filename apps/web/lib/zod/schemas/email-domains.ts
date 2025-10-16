import z from "@/lib/zod";

export const EmailDomainSchema = z.object({
  id: z.string(),
  slug: z.string(),
  verified: z.boolean(),
  lastChecked: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createEmailDomainBodySchema = z.object({
  slug: z.string(),
  fromAddress: z.string().email(),
});

export const updateEmailDomainBodySchema =
  createEmailDomainBodySchema.partial();
