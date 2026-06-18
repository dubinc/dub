import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { OAuthProvider, OAuthProviderConfig } from "../oauth-provider";
import { intercomAuthTokenSchema } from "./schema";

class IntercomOAuthProvider extends OAuthProvider<
  typeof intercomAuthTokenSchema
> {
  constructor(provider: OAuthProviderConfig<typeof intercomAuthTokenSchema>) {
    super(provider);
  }
}

export const intercomOAuthProvider = new IntercomOAuthProvider({
  name: "Intercom",
  clientId: process.env.INTERCOM_CLIENT_ID!,
  clientSecret: process.env.INTERCOM_CLIENT_SECRET!,
  authUrl: "https://app.intercom.com/oauth",
  tokenUrl: "https://api.intercom.io/auth/eagle/token",
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/intercom/callback`,
  redisStatePrefix: "intercom:oauth:state",
  tokenSchema: intercomAuthTokenSchema,
  bodyFormat: "json",
  authorizationMethod: "body",
});
