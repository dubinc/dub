import { decryptOrPassthrough, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { InstalledIntegration } from "@prisma/client";
import { OAuthProvider, OAuthProviderConfig } from "../oauth-provider";
import { HubSpotAuthToken } from "../types";
import { hubSpotAuthTokenSchema } from "./schema";

class HubSpotOAuthProvider extends OAuthProvider<
  typeof hubSpotAuthTokenSchema
> {
  constructor(provider: OAuthProviderConfig<typeof hubSpotAuthTokenSchema>) {
    super(provider);
  }

  async refreshTokenForInstallation(
    installation: InstalledIntegration,
  ): Promise<HubSpotAuthToken> {
    let token = hubSpotAuthTokenSchema.parse(installation.credentials);

    token = {
      ...token,
      access_token: decryptOrPassthrough(token.access_token),
      refresh_token: decryptOrPassthrough(token.refresh_token),
    };

    if (this.isTokenValid(token)) {
      return token;
    }

    const newToken = await this.refreshToken(token.refresh_token);

    const credentials = {
      ...newToken,
      created_at: Date.now(),
    };

    await prisma.installedIntegration.update({
      where: {
        id: installation.id,
      },
      data: {
        credentials: {
          ...credentials,
          access_token: encrypt(credentials.access_token),
          refresh_token: encrypt(credentials.refresh_token),
        },
      },
    });

    return credentials;
  }

  async uninstall(installation: InstalledIntegration) {
    const token = hubSpotAuthTokenSchema.parse(installation.credentials);

    let accessToken = decryptOrPassthrough(token.access_token);

    if (!this.isTokenValid(token)) {
      const newToken = await this.refreshToken(
        decryptOrPassthrough(token.refresh_token),
      );

      accessToken = newToken.access_token;
    }

    const response = await fetch(
      "https://api.hubapi.com/appinstalls/2026-03/external-install",
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = await response.text();

      console.error("[HubSpot] uninstall", data);

      throw new Error(
        `[HubSpot] Failed to uninstall the app from HubSpot portal ${token.hub_id}.`,
      );
    }
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
  clientId: process.env.HUBSPOT_CLIENT_ID!,
  clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
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
  ].join(" "),
  tokenSchema: hubSpotAuthTokenSchema,
  bodyFormat: "form",
  authorizationMethod: "body",
});
