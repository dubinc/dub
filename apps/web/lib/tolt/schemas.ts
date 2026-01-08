import slugify from "@sindresorhus/slugify";
import * as z from "zod/v4";

export const toltImportSteps = z.enum([
  "import-partners",
  "import-links",
  "import-customers",
  "import-commissions",
  "update-stripe-customers", // update the customers with their stripe customer ID
  "cleanup-partners", // remove partners with 0 leads
]);

export const toltImportPayloadSchema = z.object({
  importId: z.string(),
  userId: z.string(),
  programId: z.string(),
  toltProgramId: z.string(),
  action: toltImportSteps,
  startingAfter: z.string().optional(),
});

export const ToltProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  payout_term: z.string(),
  currency_code: z.string(),
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
  value: z.string().transform((val) => slugify(val)), // need to slugify this cause Tolt can sometimes return "john doe"
  partner: ToltAffiliateSchema,
});

export const ToltCustomerSchema = z.object({
  id: z.string(),
  customer_id: z
    .string()
    .describe("Internal customer identifier in client's app.")
    .nullable(),
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
  revenue: z
    .string()
    .nullable()
    .describe("Revenue of the transaction in cents."),
  transaction_id: z.string().nullable(),
  charge_id: z.string().nullable(),
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
