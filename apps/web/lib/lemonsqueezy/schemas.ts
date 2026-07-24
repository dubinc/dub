import * as z from "zod/v4";

export const lemonSqueezyImportSteps = z.enum([
  "import-partners",
  "import-customers",
  "import-commissions",
]);

export const lemonSqueezyImportPayloadSchema = z.object({
  importId: z.string(),
  userId: z.string(),
  programId: z.string(),
  storeId: z.string(),
  action: lemonSqueezyImportSteps,
  page: z.number().optional(),
  // Used by import-commissions to paginate orders first, then subscription invoices
  resource: z.enum(["orders", "subscription-invoices"]).optional(),
});

const jsonApiResourceSchema = z.object({
  type: z.string(),
  id: z.string(),
  attributes: z.record(z.string(), z.unknown()),
  relationships: z.record(z.string(), z.unknown()).optional(),
});

export const lemonSqueezyJsonApiListSchema = z.object({
  data: z.array(jsonApiResourceSchema),
  included: z.array(jsonApiResourceSchema).optional(),
  meta: z
    .object({
      page: z
        .object({
          currentPage: z.number(),
          from: z.number().nullable().optional(),
          lastPage: z.number(),
          perPage: z.number(),
          to: z.number().nullable().optional(),
          total: z.number(),
        })
        .optional(),
    })
    .optional(),
  links: z
    .object({
      first: z.string().optional(),
      last: z.string().optional(),
      next: z.string().nullable().optional(),
      prev: z.string().nullable().optional(),
    })
    .optional(),
});

export const lemonSqueezyStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  domain: z.string(),
  url: z.string(),
  currency: z.string().nullish(),
  total_sales: z.number().nullish(),
  total_revenue: z.number().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});

export const lemonSqueezyAffiliateSchema = z.object({
  id: z.string(),
  store_id: z.number(),
  user_id: z.number().nullish(),
  user_name: z.string().nullish(),
  user_email: z.string(),
  share_domain: z.string().nullish(),
  status: z.string(),
  products: z.unknown().nullish(),
  application_note: z.string().nullish(),
  total_earnings: z.number().nullish(),
  unpaid_earnings: z.number().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  // Optional if Lemon Squeezy exposes the affiliate link token
  token: z.string().nullish(),
});

export const lemonSqueezyCustomerSchema = z.object({
  id: z.string(),
  store_id: z.number(),
  name: z.string().nullish(),
  email: z.string(),
  status: z.string().nullish(),
  city: z.string().nullish(),
  region: z.string().nullish(),
  country: z.string().nullish(),
  total_revenue_currency: z.number().nullish(),
  mrr: z.number().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  test_mode: z.boolean().nullish(),
  affiliate_ids: z.array(z.string()).default([]),
});

export const lemonSqueezyOrderSchema = z.object({
  id: z.string(),
  store_id: z.number(),
  customer_id: z.number(),
  affiliate_id: z.number().nullish(),
  identifier: z.string().nullish(),
  order_number: z.number().nullish(),
  user_name: z.string().nullish(),
  user_email: z.string().nullish(),
  currency: z.string(),
  currency_rate: z.union([z.string(), z.number()]).nullish(),
  subtotal: z.number(),
  discount_total: z.number().nullish(),
  tax: z.number().nullish(),
  total: z.number().nullish(),
  subtotal_usd: z.number().nullish(),
  discount_total_usd: z.number().nullish(),
  tax_usd: z.number().nullish(),
  total_usd: z.number().nullish(),
  refunded_amount: z.number().nullish(),
  refunded_amount_usd: z.number().nullish(),
  status: z.string(),
  refunded: z.boolean().nullish(),
  refunded_at: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  test_mode: z.boolean().nullish(),
});

export const lemonSqueezySubscriptionInvoiceSchema = z.object({
  id: z.string(),
  store_id: z.number(),
  subscription_id: z.number().nullish(),
  customer_id: z.number(),
  affiliate_id: z.number().nullish(),
  user_name: z.string().nullish(),
  user_email: z.string().nullish(),
  billing_reason: z.string().nullish(),
  currency: z.string(),
  currency_rate: z.union([z.string(), z.number()]).nullish(),
  status: z.string(),
  refunded: z.boolean().nullish(),
  refunded_at: z.string().nullish(),
  subtotal: z.number(),
  discount_total: z.number().nullish(),
  tax: z.number().nullish(),
  total: z.number().nullish(),
  refunded_amount: z.number().nullish(),
  subtotal_usd: z.number().nullish(),
  discount_total_usd: z.number().nullish(),
  tax_usd: z.number().nullish(),
  total_usd: z.number().nullish(),
  refunded_amount_usd: z.number().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  test_mode: z.boolean().nullish(),
});
