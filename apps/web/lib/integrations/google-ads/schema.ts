import * as z from "zod/v4";

// Token returned by Google's OAuth token endpoint at connect time (not persisted).
export const googleAdsAuthTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().describe("Access token lifetime in seconds."),
  scope: z.string(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  created_at: z
    .number()
    .optional()
    .describe("Unix ms timestamp of when the token was issued/refreshed."),
});

export const googleAdsCredentialsSchema = googleAdsAuthTokenSchema
  .partial()
  .extend({
    partnerLinkName: z.string().optional(),
  });

export const googleAdsSettingsSchema = z.object({
  customerId: z.string().nullable().default(null),
  customerIds: z.array(z.string()).default([]),
  leadConversionActionId: z.string().nullable().default(null), // Check if this is required.
  saleConversionActionId: z.string().nullable().default(null), // Check if this is required.
  saleLtvValue: z.number().nullable().default(null), // Check if this is required.
});

export const googleAdsEditableSettingsSchema = googleAdsSettingsSchema
  .pick({
    customerId: true,
    leadConversionActionId: true,
    saleConversionActionId: true,
    saleLtvValue: true,
  })
  .refine(
    (data) =>
      data.saleLtvValue === null ||
      (Number.isFinite(data.saleLtvValue) && data.saleLtvValue >= 0),
    {
      message: "Sale LTV value must be a non-negative number.",
      path: ["saleLtvValue"],
    },
  );

export const googleAdsSettingsFormSchema = z.object({
  customerId: z.string(),
  leadConversionActionId: z.string(),
  saleConversionActionId: z.string(),
  saleLtvValue: z.string(),
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
    eventTimestamp: z.string().describe("RFC 3339 timestamp."),
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
export type GoogleAdsEditableSettings = z.infer<
  typeof googleAdsEditableSettingsSchema
>;
export type GoogleAdsSettingsFormData = z.infer<
  typeof googleAdsSettingsFormSchema
>;
export type UpdateGoogleAdsSettingsInput = z.infer<
  typeof updateGoogleAdsSettingsSchema
>;
export type IngestConversionEvent = z.infer<typeof ingestConversionEventSchema>;
export type GoogleClickId = z.infer<typeof googleClickIdSchema>;
export type PartnerLink = z.infer<typeof partnerLinkSchema>;
export type IngestDestination = z.infer<typeof ingestDestinationSchema>;
export type IngestEvent = z.infer<typeof ingestEventSchema>;
export type IngestEventsResponse = z.infer<typeof ingestEventsResponseSchema>;
