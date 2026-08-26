import * as z from "zod/v4";

export const googleAdsAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
  created_at: z.number().optional(),
});

export const googleAdsCustomerSchema = z.object({
  id: z.string(),
  resourceName: z.string(),
  descriptiveName: z.string(),
  manager: z.boolean(),
});

export const googleAdsSettingsSchema = z.object({
  customers: z.array(googleAdsCustomerSchema).default([]),
  customerId: z.string().nullish(),
  loginCustomerId: z.string().nullish(),
  customerName: z.string().nullish(),
  leadConversionAction: z.string().nullish(),
  saleConversionAction: z.string().nullish(),
});

export const googleAdsConversionActionSchema = z.object({
  id: z.string(),
  resourceName: z.string(),
  name: z.string(),
});

export const googleAdsConversionUploadSchema = z.object({
  workspaceId: z.string(),
  eventType: z.enum(["lead", "sale"]),
  click: z.object({
    id: z.string(),
    url: z.string(),
  }),
  conversionDateTime: z.string(),
  eventId: z.string(),
  conversionValue: z.number().optional(),
  currencyCode: z.string().optional(),
  conversionCount: z.number().positive().optional(),
});
