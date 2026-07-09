import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, nanoid } from "@dub/utils";
import { InstalledIntegration } from "@prisma/client";
import * as z from "zod/v4";
import { redis } from "../../upstash";
import { OAuthProvider, OAuthProviderConfig } from "../oauth-provider";
import { GOOGLE_ADS_OAUTH_SCOPE } from "./constants";
import { googleAdsAuthTokenSchema } from "./schema";

class GoogleAdsOAuthProvider extends OAuthProvider<
  typeof googleAdsAuthTokenSchema
> {
  private readonly config: OAuthProviderConfig<typeof googleAdsAuthTokenSchema>;

  constructor(provider: OAuthProviderConfig<typeof googleAdsAuthTokenSchema>) {
    super(provider);
    this.config = provider;
  }

  async generateAuthUrl(contextId: string | Record<string, string>) {
    const state = nanoid(16);
    await redis.set(`${this.config.redisStatePrefix}:${state}`, contextId, {
      ex: 30 * 60,
    });

    const searchParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: GOOGLE_ADS_OAUTH_SCOPE,
      response_type: "code",
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return `${this.config.authUrl}?${searchParams.toString()}`;
  }

  async getAccessToken(
    installation: Pick<InstalledIntegration, "id" | "credentials">,
  ): Promise<z.infer<typeof googleAdsAuthTokenSchema>> {
    let existingCredentials = googleAdsAuthTokenSchema.parse(
      installation.credentials,
    );

    existingCredentials = {
      ...existingCredentials,
      access_token: decrypt(existingCredentials.access_token),
      refresh_token: decrypt(existingCredentials.refresh_token),
    };

    if (this.isTokenValid(existingCredentials)) {
      return existingCredentials;
    }

    if (!existingCredentials.refresh_token) {
      throw new Error(
        "[Google Ads] Missing refresh token. Please reconnect the integration.",
      );
    }

    const newToken = await this.fetchRefreshedToken(
      existingCredentials.refresh_token,
    );

    const newCredentials = {
      ...existingCredentials,
      ...newToken,
    };

    await prisma.installedIntegration.update({
      where: {
        id: installation.id,
      },
      data: {
        credentials: googleAdsAuthTokenSchema.parse({
          ...newCredentials,
          access_token: encrypt(newCredentials.access_token),
          refresh_token: encrypt(newCredentials.refresh_token),
        }),
      },
    });

    return newCredentials;
  }

  private async fetchRefreshedToken(refreshToken: string) {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    const newToken = await response.json();

    if (!response.ok) {
      console.error(`[${this.config.name}] refreshToken`, newToken);

      throw new Error(
        `[${this.config.name}] Failed to refresh the access token. Please try again.`,
      );
    }

    return googleAdsAuthTokenSchema.parse({
      ...newToken,
      refresh_token: newToken.refresh_token ?? refreshToken,
      created_at: Date.now(),
    });
  }

  isTokenValid(token: z.infer<typeof googleAdsAuthTokenSchema>) {
    if (!token.created_at) {
      return false;
    }

    const buffer = 60 * 1000;
    const expiresAt = token.created_at + token.expires_in * 1000;

    return Date.now() < expiresAt - buffer;
  }
}

export const googleAdsOAuthProvider = new GoogleAdsOAuthProvider({
  name: "Google Ads",
  clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/gad/callback`,
  redisStatePrefix: "google-ads:oauth:state",
  tokenSchema: googleAdsAuthTokenSchema,
  bodyFormat: "form",
  authorizationMethod: "body",
});
