import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export const hubSpotEnvSchema = z.object({
  HUBSPOT_CLIENT_ID: z.string().default(""),
  HUBSPOT_CLIENT_SECRET: z.string().default(""),
  HUBSPOT_REDIRECT_URI: z
    .string()
    .default(`${APP_DOMAIN_WITH_NGROK}/api/hubspot/callback`),
});

export const hubSpotAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scopes: z.array(z.string()),
  expires_in: z.number(),
  hub_id: z.number(),
});
