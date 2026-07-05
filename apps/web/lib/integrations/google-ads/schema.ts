import * as z from "zod/v4";

// Token returned by Google's OAuth token endpoint.
// `refresh_token` is only returned when the user consents with
// `access_type=offline` (and `prompt=consent`, which we always send).
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

// Integration credentials Dub stores (access/refresh tokens are encrypted at rest).
export const googleAdsCredentialsSchema = googleAdsAuthTokenSchema.extend({
  created_at: z.number(),
  customerIds: z
    .array(z.string())
    .default([])
    .describe(
      "Google Ads customer IDs accessible to the connected user, e.g. ['1234567890']. Discovered at connect time via listAccessibleCustomers.",
    ),
});

// A single offline click conversion to upload to Google Ads.
// Exactly one of gclid / wbraid / gbraid identifies the click.
export const uploadClickConversionSchema = z
  .object({
    customerId: z
      .string()
      .describe("Google Ads customer ID the conversion belongs to (digits only)."),
    conversionActionId: z
      .string()
      .describe("Numeric ID of the conversion action to attribute to."),
    gclid: z.string().optional(),
    wbraid: z.string().optional(),
    gbraid: z.string().optional(),
    conversionDateTime: z
      .string()
      .describe(
        'Format "yyyy-mm-dd hh:mm:ss+|-hh:mm", e.g. "2019-01-01 12:32:45-08:00".',
      ),
    conversionValue: z.number(),
    currencyCode: z.string().describe("ISO 4217 currency code, e.g. 'USD'."),
    orderId: z.string().optional(),
  })
  .refine((data) => data.gclid || data.wbraid || data.gbraid, {
    message: "One of gclid, wbraid, or gbraid is required.",
  });

export type GoogleAdsAuthToken = z.infer<typeof googleAdsAuthTokenSchema>;
export type GoogleAdsCredentials = z.infer<typeof googleAdsCredentialsSchema>;
export type UploadClickConversion = z.infer<typeof uploadClickConversionSchema>;
