import * as z from "zod/v4";

export const intercomAuthTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

// Integration credentials
export const intercomCredentialsSchema = z.object({
  accessToken: z.string(),
  appId: z.string().describe("Intercom workspace ID."),
});

export const intercomWebhookSchema = z.object({
  type: z.string(),
  topic: z.string(),
  data: z.object({
    item: z.record(z.string(), z.unknown()),
  }),
  app_id: z.string().optional(),
});
