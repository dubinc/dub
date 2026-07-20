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
    const existingCredentials = this.decryptCredentials(
      installation.credentials,
    );

    if (this.isTokenValid(existingCredentials)) {
      return existingCredentials;
    }

    if (!existingCredentials.refresh_token) {
      throw new Error(
        "[Google Ads] Missing refresh token. Please reconnect the integration.",
      );
    }

    const lockKey = `googleAds:oauth:refresh:${installation.id}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const refreshed = await this.withRefreshLock(lockKey, () =>
        this.refreshCredentialsUnderLock(installation.id),
      );

      if (refreshed) {
        return refreshed;
      }

      const waited = await this.waitForRefreshedCredentials(installation.id);

      if (waited) {
        return waited;
      }
    }

    throw new Error(
      "[Google Ads] Failed to refresh the access token. Please try again.",
    );
  }

  private async withRefreshLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await redis.set(lockKey, "1", { nx: true, ex: 20 });

    if (!acquired) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await redis.del(lockKey);
    }
  }

  private decryptCredentials(
    credentials: InstalledIntegration["credentials"],
  ): z.infer<typeof googleAdsAuthTokenSchema> {
    const parsed = googleAdsAuthTokenSchema.parse(credentials);

    return {
      ...parsed,
      access_token: decrypt(parsed.access_token),
      refresh_token: decrypt(parsed.refresh_token),
    };
  }

  private async loadCredentials(installationId: string) {
    const installation = await prisma.installedIntegration.findUniqueOrThrow({
      where: {
        id: installationId,
      },
      select: {
        credentials: true,
      },
    });

    return this.decryptCredentials(installation.credentials);
  }

  private async refreshCredentialsUnderLock(installationId: string) {
    const existingCredentials = await this.loadCredentials(installationId);

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
        id: installationId,
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

  private async waitForRefreshedCredentials(installationId: string) {
    const pollIntervalMs = 200;
    const timeoutMs = 5_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const delay = pollIntervalMs + Math.floor(Math.random() * pollIntervalMs);
      await new Promise((resolve) => setTimeout(resolve, delay));

      const credentials = await this.loadCredentials(installationId);

      if (this.isTokenValid(credentials)) {
        return credentials;
      }
    }

    return null;
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
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/google-ads/callback`,
  redisStatePrefix: "google-ads:oauth:state",
  tokenSchema: googleAdsAuthTokenSchema,
  bodyFormat: "form",
  authorizationMethod: "body",
});
