import { z } from "zod";

export const firstPromoterImportSteps = z.enum([
  "import-partners",
  "import-links",
  "import-customers",
  "import-commissions",
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
  groupId: z.string().optional(),
  campaignId: z.string(),
  page: z.number().optional(),
});

export const firstPromoterCampaignSchema = z.object({
  id: z.string(),
  campaign: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const firstPromoterPartnerSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  cust_id: z.string().nullable(),
  state: z.enum([
    "pending",
    "accepted",
    "rejected",
    "blocked",
    "inactive",
    "not_set",
  ]),
  profile: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    website: z.string().nullable(),
    company_name: z.string().nullable(),
    company_number: z.string().nullable(),
    vat_id: z.string().nullable(),
    country: z.string().nullable(),
    address: z.string().nullable(),
    avatar: z.string().nullable(),
    description: z.string().nullable(),
    youtube_url: z.string().nullable(),
    twitter_url: z.string().nullable(),
    linkedin_url: z.string().nullable(),
    instagram_url: z.string().nullable(),
    tiktok_url: z.string().nullable(),
    joined_at: z.string(),
  }),
  stats: z.object({
    referrals_count: z.number(),
  }),
});

export const firstPromoterCustomerSchema = z.object({
  id: z.string(),
  email: z.string(),
  uid: z.string(),
  state: z.enum([
    "subscribed",
    "signup",
    "active",
    "cancelled",
    "refunded",
    "denied",
    "pending",
    "moved",
  ]),
  metadata: z.record(z.any()).nullable(),
  created_at: z.string(),
  customer_since: z.string(),
  promoter_campaign: z.object({
    promoter: firstPromoterPartnerSchema.pick({
      id: true,
      email: true,
    }),
  }),
});

export const firstPromoterCommissionSchema = z.object({
  id: z.string(),
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
      id: true,
      email: true,
      uid: true,
    })
    .nullable(),
  promoter_campaign: z.object({
    campaign: firstPromoterCampaignSchema.pick({
      id: true,
    }),
    promoter: firstPromoterPartnerSchema.pick({
      id: true,
      email: true,
    }),
  }),
});
