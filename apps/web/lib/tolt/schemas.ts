import { z } from "zod";

export const ToltProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  payout_term: z.string(),
});

export const ToltAffiliateSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  company_name: z.string().nullable(),
  country_code: z.string().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  program: ToltProgramSchema.optional(),
});

export const ToltLinkSchema = z.object({
  id: z.string(),
  param: z.string(),
  value: z.string(),
  partner: ToltAffiliateSchema,
});
