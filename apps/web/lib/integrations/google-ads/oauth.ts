import { OAuthProvider } from "../oauth-provider";
import { GOOGLE_ADS_OAUTH_SCOPES } from "./constants";
import { googleAdsEnv } from "./env";
import { googleAdsAuthTokenSchema } from "./schema";

export const googleAdsOAuthProvider = new OAuthProvider({
  name: "Google Ads",
  clientId: googleAdsEnv.GOOGLE_ADS_CLIENT_ID,
  clientSecret: googleAdsEnv.GOOGLE_ADS_CLIENT_SECRET,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  redirectUri: `http://localhost:8888/api/gad/callback`,
  redisStatePrefix: "gad:oauth:state",
  scopes: GOOGLE_ADS_OAUTH_SCOPES,
  tokenSchema: googleAdsAuthTokenSchema,
  bodyFormat: "form",
  authorizationMethod: "body",
});
