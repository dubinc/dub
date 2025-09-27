import { prisma } from "@dub/prisma";
import { InstalledIntegration } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { OAuthProvider, OAuthProviderConfig } from "../oauth-provider";
import { HubSpotAuthToken } from "./types";

const hubSpotTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scopes: z.array(z.string()),
  hub_id: z.number(),
  expires_in: z.number().describe("Expires in seconds."),
  created_at: z.number().optional(),
});

class HubSpotOAuthProvider extends OAuthProvider<typeof hubSpotTokenSchema> {
  constructor(config: OAuthProviderConfig) {
    super(config);
  }

  async refreshTokenForInstallation(
    installation: InstalledIntegration,
  ): Promise<HubSpotAuthToken> {
    const token = hubSpotTokenSchema.parse(installation.credentials);

    if (this.isTokenValid(token)) {
      return token;
    }

    const newToken = await this.refreshToken(token.access_token);

    const credentials = {
      ...newToken,
      created_at: Date.now(),
    };

    await prisma.installedIntegration.update({
      where: {
        id: installation.id,
      },
      data: {
        credentials,
      },
    });

    return credentials;
  }

  isTokenValid(token: HubSpotAuthToken) {
    if (!token.created_at) {
      return false;
    }

    const buffer = 60 * 1000; // refresh 1 min early
    const expiresAt = token.created_at + token.expires_in * 1000;

    return Date.now() < expiresAt - buffer;
  }
}

export const hubSpotOAuthProvider = new HubSpotOAuthProvider({
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
