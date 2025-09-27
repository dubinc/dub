import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { OAuthProvider } from "../oauth-provider";

const hubSpotTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scopes: z.array(z.string()),
  hub_id: z.number(),
  expires_in: z.number().describe("Expires in seconds."),
  created_at: z.number(),
});

export const hubSpotOAuthProvider = new OAuthProvider<typeof hubSpotTokenSchema>({
  name: "HubSpot",
  clientId: process.env.HUBSPOT_CLIENT_ID || "",
  clientSecret: process.env.HUBSPOT_CLIENT_SECRET || "",
  authUrl: "https://app.hubspot.com/oauth/authorize",
  tokenUrl: "https://api.hubapi.com/oauth/v1/token",
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/hubspot/callback`,
  redisStatePrefix: "hubspot:oauth:state",
  scopes: [
    "oauth",
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.deals.read",
    "crm.schemas.contacts.write",
  ],
  tokenSchema: hubSpotTokenSchema,
});
