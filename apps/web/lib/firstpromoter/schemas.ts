import { z } from "zod";

export const firstPromoterImportSteps = z.enum([
  "import-campaigns",
  "import-partners",
  "import-customers",
  "import-commissions",
  "update-stripe-customers",
]);

export const firstPromoterCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  accountId: z.string().min(1),
});

export const firstPromoterImportPayloadSchema = z.object({
  action: firstPromoterImportSteps,
  importId: z.string(),
  userId: z.string(),
  programId: z.string(),
  page: z.number().optional().describe("FP pagination"),
  startingAfter: z.string().optional().describe("Internal pagination"),
});

export const firstPromoterCampaignSchema = z.object({
  campaign: z.object({
    id: z.number(),
    name: z.string(),
  }),
});

export const firstPromoterPartnerSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  profile: z.object({
    id: z.number(),
    website: z
      .string()
      .nullable()
      .transform((val) => val || null),
    company_name: z
      .string()
      .nullable()
      .transform((val) => val || null),
    country: z
      .string()
      .nullable()
      .transform((val) => val || null),
    address: z
      .string()
      .nullable()
      .transform((val) => val || null),
    avatar: z
      .string()
      .nullable()
      .transform((val) => val || null),
    description: z
      .string()
      .nullable()
      .transform((val) => val || null),
    youtube_url: z
      .string()
      .nullable()
      .transform((val) => val || null),
    twitter_url: z
      .string()
      .nullable()
      .transform((val) => val || null),
    linkedin_url: z
      .string()
      .nullable()
      .transform((val) => val || null),
    instagram_url: z
      .string()
      .nullable()
      .transform((val) => val || null),
    tiktok_url: z
      .string()
      .nullable()
      .transform((val) => val || null),
  }),
  promoter_campaigns: z.array(
    z.object({
      campaign: z.object({
        name: z.string(),
      }),
      ref_token: z.string().nullable(),
    }),
  ),
});

export const firstPromoterCustomerSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  uid: z.string().nullable(),
  created_at: z.string(),
  customer_since: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  promoter_campaign: z.object({
    promoter: firstPromoterPartnerSchema.pick({
      email: true,
    }),
  }),
});

export const firstPromoterCommissionSchema = z.object({
  id: z.number(),
  status: z.enum(["pending", "approved", "denied"]),
  metadata: z.record(z.any()).nullable(),
  is_self_referral: z.boolean(),
  commission_type: z.enum(["sale", "custom"]),
  sale_amount: z.number(),
  amount: z.number(),
  is_paid: z.boolean(),
  is_split: z.boolean(),
  created_at: z.string(),
  original_sale_amount: z.number(),
  original_sale_currency: z.string().nullable(),
  external_note: z.string().nullable(),
  unit: z.enum([
    "cash",
    "credits",
    "points",
    "free_months",
    "mon_discount",
    "discount_per",
  ]),
  fraud_check: z
    .enum([
      "no_suspicion",
      "same_ip_suspicion",
      "same_promoter_email",
      "ad_source",
    ])
    .nullable(),
  referral: firstPromoterCustomerSchema
    .pick({
      email: true,
      uid: true,
    })
    .nullable(),
});
