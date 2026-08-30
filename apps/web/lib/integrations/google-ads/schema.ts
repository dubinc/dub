import * as z from "zod/v4";
import { getGoogleAdsEventMappingsError } from "./utils";

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
  // Manager account to send as login-customer-id. Null means direct access.
  loginCustomerId: z.string().nullish(),
});

export const googleAdsEventMappingSchema = z.object({
  conversionAction: z.string().min(1),
  // Empty means this mapping matches unmatched event names of that type
  eventNames: z.array(z.string().trim().min(1).max(255)).max(50).default([]),
});

const googleAdsEventMappingsSchema = z
  .array(googleAdsEventMappingSchema)
  .max(50)
  .superRefine((mappings, ctx) => {
    const error = getGoogleAdsEventMappingsError(mappings);
    if (error) {
      ctx.addIssue({
        code: "custom",
        message: error,
      });
    }
  })
  .default([]);

export const googleAdsSettingsSchema = z.object({
  customers: z.array(googleAdsCustomerSchema).default([]),
  customerId: z.string().nullish(),
  loginCustomerId: z.string().nullish(),
  customerName: z.string().nullish(),
  leadMappings: googleAdsEventMappingsSchema,
  saleMappings: googleAdsEventMappingsSchema,
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
  eventName: z.string().optional(),
  conversionValue: z.number().optional(),
  currencyCode: z.string().optional(),
  conversionCount: z.number().positive().optional(),
});
