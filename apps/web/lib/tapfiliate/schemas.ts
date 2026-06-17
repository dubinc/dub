import * as z from "zod/v4";

export const tapfiliateImportSteps = z.enum([
  "import-partners",
  "import-customers",
  "import-commissions",
]);

export const tapfiliateImportPayloadSchema = z.object({
  importId: z.string(),
  userId: z.string(),
  programId: z.string(),
  tapfiliateProgramId: z.string(),
  action: tapfiliateImportSteps,
  page: z.number().optional(),
});

export const tapfiliateProgramSchema = z.object({
  id: z.string(),
  title: z.string(),
  currency: z.string().nullish(),
});

export const tapfiliatePartnerSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  affiliate_group_id: z.string().nullable(),
  address: z
    .object({
      country: z.object({
        code: z.string(),
      }),
    })
    .nullable(),
});

export const tapfiliateCustomerSchema = z.object({
  id: z.string(),
  customer_id: z.string().describe("External customer ID."),
  created_at: z.string(),
  click: z
    .object({
      created_at: z.string(),
      referrer: z.string().nullable(),
      landing_page: z.string().nullable(),
    })
    .nullable(),
  program: tapfiliateProgramSchema
    .pick({
      id: true,
    })
    .nullable(),
  affiliate: tapfiliatePartnerSchema
    .pick({
      id: true,
    })
    .nullable(),
});

// Tapfiliate returns monetary amounts either as a number or a numeric string.
const tapfiliateAmount = z.union([z.number(), z.string()]).nullish();

export const tapfiliateCommissionSchema = z.object({
  id: z.union([z.number(), z.string()]).nullish(),
  amount: tapfiliateAmount,
  // approved: true = approved, false = disapproved, null = pending
  approved: z.boolean().nullish(),
  // payout is set once the commission has been paid out
  payout: z.any(),
  currency: z.string().nullish(),
  affiliate: tapfiliatePartnerSchema.nullish(),
});

export const tapfiliateConversionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  external_id: z.string().nullish(),
  amount: tapfiliateAmount,
  currency: z.string().nullish(),
  commissions: z.array(tapfiliateCommissionSchema).nullish(),
  affiliate: tapfiliatePartnerSchema.nullish(),
  customer: tapfiliateCustomerSchema.nullish(),
  program: tapfiliateProgramSchema.nullish(),
  coupon: z.string().nullish(),
  created_at: z.string(),
});
