import { decryptOrPassthrough, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { InstalledIntegration } from "@prisma/client";
import { OAuthProvider, OAuthProviderConfig } from "../oauth-provider";
import { GoogleAdsAuthToken, googleAdsAuthTokenSchema } from "./schema";

class GoogleAdsOAuthProvider extends OAuthProvider<
  typeof googleAdsAuthTokenSchema
> {
  constructor(provider: OAuthProviderConfig<typeof googleAdsAuthTokenSchema>) {
    super(provider);
  }

  // Return a valid (decrypted) access token for the installation, refreshing it
  // via the stored refresh_token if it has expired, and persisting the new token.
  async refreshTokenForInstallation(
    installation: InstalledIntegration,
  ): Promise<GoogleAdsAuthToken> {
    let token = googleAdsAuthTokenSchema.parse(installation.credentials);

    token = {
      ...token,
      access_token: decryptOrPassthrough(token.access_token),
      refresh_token: token.refresh_token
        ? decryptOrPassthrough(token.refresh_token)
        : undefined,
    };

    if (this.isTokenValid(token)) {
      return token;
    }

    if (!token.refresh_token) {
      throw new Error(
        "[Google Ads] No refresh token available. Please reconnect the integration.",
      );
    }

    const newToken = await this.refreshToken(token.refresh_token);

    // Google omits refresh_token on refresh responses — keep the existing one.
    const credentials: GoogleAdsAuthToken = {
      ...newToken,
      refresh_token: newToken.refresh_token ?? token.refresh_token,
      created_at: Date.now(),
    };

    await prisma.installedIntegration.update({
      where: {
        id: installation.id,
      },
      data: {
        credentials: {
          ...(installation.credentials as Record<string, any>),
          ...credentials,
          access_token: encrypt(credentials.access_token),
          refresh_token: credentials.refresh_token
            ? encrypt(credentials.refresh_token)
            : undefined,
        },
      },
    });

    return credentials;
  }

  isTokenValid(token: GoogleAdsAuthToken) {
    if (!token.created_at) {
      return false;
    }

    const buffer = 60 * 1000; // refresh 1 min early
    const expiresAt = token.created_at + token.expires_in * 1000;

    return Date.now() < expiresAt - buffer;
  }
}

// Separate OAuth client from the one used for login (GOOGLE_CLIENT_ID), so users
// are only prompted for the Google Ads scope — not login/profile permissions.
export const googleAdsOAuthProvider = new GoogleAdsOAuthProvider({
  name: "Google Ads",
  clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/gad/callback`,
  redisStatePrefix: "gad:oauth:state",
  scopes: "https://www.googleapis.com/auth/adwords",
  // access_type=offline returns a refresh_token; prompt=consent forces Google to
  // re-issue it on every consent (Google otherwise omits it after the first grant).
  authParams: {
    access_type: "offline",
    prompt: "consent",
  },
  tokenSchema: googleAdsAuthTokenSchema,
  bodyFormat: "form",
  authorizationMethod: "body",
});
