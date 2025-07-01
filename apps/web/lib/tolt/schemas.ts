import { z } from "zod";

export const ToltProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  payout_term: z.string(),
  total_affiliates: z.number(), // custom property doesn't exist in the API response
});

export const ToltAffiliateSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  company_name: z.string().nullable(),
  country_code: z.string().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  program: ToltProgramSchema.omit({
    total_affiliates: true,
  }).optional(),
});
