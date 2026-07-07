import * as z from "zod/v4";

// Token returned by Google's OAuth token endpoint (ephemeral — not persisted).
export const googleAdsAuthTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  created_at: z.number().optional(),
});

export const googleAdsCredentialsSchema = z.object({
  partnerLinkName: z.string().optional(),
});

export const googleAdsSettingsSchema = z.object({
  customerId: z.string().nullable().default(null),
  leadConversionActionId: z.string().nullable().default(null),
  saleConversionActionId: z.string().nullable().default(null),
});

export const googleAdsEditableSettingsSchema = googleAdsSettingsSchema.pick({
  leadConversionActionId: true,
  saleConversionActionId: true,
});

export const googleAdsSettingsFormSchema = z.object({
  leadConversionActionId: z.string(),
  saleConversionActionId: z.string(),
});

export const updateGoogleAdsSettingsSchema =
  googleAdsEditableSettingsSchema.extend({
    workspaceId: z.string(),
  });

// Input for ingesting a single offline conversion via Data Manager API.
export const ingestConversionEventSchema = z
  .object({
    conversionActionId: z.string(),
    gclid: z.string().optional(),
    wbraid: z.string().optional(),
    gbraid: z.string().optional(),
    conversionValue: z.number(),
    eventTimestamp: z.string(),
    transactionId: z.string(),
  })
  .refine((data) => data.gclid || data.wbraid || data.gbraid, {
    message: "One of gclid, wbraid, or gbraid is required.",
  });

const googleClickIdSchema = z.object({
  gclid: z.string().optional(),
  wbraid: z.string().optional(),
  gbraid: z.string().optional(),
});

const productAccountSchema = z.object({
  accountId: z.string(),
  accountType: z.enum(["GOOGLE_ADS", "DATA_PARTNER"]),
});

const partnerLinkSchema = z.object({
  name: z.string().optional(),
  owningAccount: productAccountSchema.optional(),
  partnerAccount: productAccountSchema.optional(),
});

const ingestDestinationSchema = z.object({
  operatingAccount: productAccountSchema,
  loginAccount: productAccountSchema,
  linkedAccount: productAccountSchema.optional(),
  productDestinationId: z.string(),
});

const ingestEventSchema = z.object({
  adIdentifiers: googleClickIdSchema.optional(),
  conversionValue: z.number(),
  currency: z.string(),
  eventTimestamp: z.string(),
  transactionId: z.string(),
  eventSource: z.string(),
});

const ingestEventsResponseSchema = z.object({
  requestId: z.string().optional(),
});

export type GoogleAdsAuthToken = z.infer<typeof googleAdsAuthTokenSchema>;
export type GoogleAdsSettingsFormData = z.infer<
  typeof googleAdsSettingsFormSchema
>;
export type IngestConversionEvent = z.infer<typeof ingestConversionEventSchema>;
export type GoogleClickId = z.infer<typeof googleClickIdSchema>;
export type PartnerLink = z.infer<typeof partnerLinkSchema>;
export type IngestDestination = z.infer<typeof ingestDestinationSchema>;
export type IngestEvent = z.infer<typeof ingestEventSchema>;
export type IngestEventsResponse = z.infer<typeof ingestEventsResponseSchema>;
