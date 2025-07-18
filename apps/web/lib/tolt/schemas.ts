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
  status: z.string().optional(),
  program: ToltProgramSchema.optional(),
});

export const ToltLinkSchema = z.object({
  id: z.string(),
  param: z.string(),
  value: z.string(),
  partner: ToltAffiliateSchema,
});

export const ToltCustomerSchema = z.object({
  id: z.string(),
  customer_id: z
    .string()
    .describe("Internal customer identifier in client's app."),
  email: z.string().nullable(),
  name: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  partner: ToltAffiliateSchema,
});

export const ToltCommissionSchema = z.object({
  id: z.string(),
  amount: z.string().describe("Amount of the commission in cents."),
  revenue: z.string().describe("Revenue of the commission in cents."),
  transaction_id: z.string().nullable(), // this can be null
  charge_id: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  partner: ToltAffiliateSchema.omit({
    status: true,
    program: true,
  }),
  customer: ToltCustomerSchema.omit({
    customer_id: true,
    partner: true,
  }),
});
