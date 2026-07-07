import { InstalledIntegration } from "@prisma/client";
import { OAuthProvider, OAuthProviderConfig } from "../oauth-provider";
import { GOOGLE_ADS_OAUTH_SCOPES } from "./constants";
import { googleAdsEnv } from "./env";
import { googleAdsProvider, isGoogleAdsAuthTokenValid } from "./provider";
import { GoogleAdsAuthToken, googleAdsAuthTokenSchema } from "./schema";

class GoogleAdsOAuthProvider extends OAuthProvider<
  typeof googleAdsAuthTokenSchema
> {
  constructor(provider: OAuthProviderConfig<typeof googleAdsAuthTokenSchema>) {
    super(provider);
  }

  async refreshTokenForInstallation(
    installation: Pick<InstalledIntegration, "credentials">,
  ): Promise<GoogleAdsAuthToken> {
    const credentials = googleAdsProvider.parseCredentials(
      installation.credentials,
    );

    if (!credentials || !credentials.refresh_token) {
      throw new Error(
        "Google Ads authorization expired. Please reconnect the integration.",
      );
    }

    if (isGoogleAdsAuthTokenValid(credentials)) {
      return credentials;
    }

    const refreshedToken = await this.refreshToken(credentials.refresh_token);

    return {
      ...refreshedToken,
      refresh_token: refreshedToken.refresh_token ?? credentials.refresh_token,
      created_at: Date.now(),
    };
  }
}

export const googleAdsOAuthProvider = new GoogleAdsOAuthProvider({
  name: "Google Ads",
  clientId: googleAdsEnv.GOOGLE_ADS_CLIENT_ID,
  clientSecret: googleAdsEnv.GOOGLE_ADS_CLIENT_SECRET,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  redirectUri: `http://localhost:8888/api/gad/callback`,
  redisStatePrefix: "gad:oauth:state",
  scopes: GOOGLE_ADS_OAUTH_SCOPES,
  authParams: {
    access_type: "offline",
    prompt: "consent",
  },
  tokenSchema: googleAdsAuthTokenSchema,
  bodyFormat: "form",
  authorizationMethod: "body",
});
