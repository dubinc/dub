import * as z from "zod/v4";

export const tapfiliateImportSteps = z.enum([
  "import-groups",
  "import-partners",
  "import-customers",
  "import-commissions",
  "update-stripe-customers",
  "cleanup-partners",
]);

export const tapfiliateImportPayloadSchema = z.object({
  importId: z.string(),
  userId: z.string(),
  programId: z.string(),
  tapfiliateProgramId: z.string(),
  action: tapfiliateImportSteps,
  page: z.number().optional(), // Tapfiliate pagination
  startingAfter: z.string().optional(), // Dub pagination
});

export const tapfiliateGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  affiliate_count: z.number(),
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

export const tapfiliateCommissionSchema = z.object({
  id: z.number(),
  currency: z.string(),
  created_at: z.string(),
  approved: z.boolean().nullable(),
  amount: z.number(),
  conversion_sub_amount: z.number(),
});

export const tapfiliateConversionSchema = z.object({
  id: z.number(),
  program: tapfiliateProgramSchema
    .pick({
      id: true,
    })
    .nullable(),
  customer: tapfiliateCustomerSchema
    .pick({
      customer_id: true,
    })
    .nullable(),
  commissions: z.array(tapfiliateCommissionSchema).nullable(),
});
