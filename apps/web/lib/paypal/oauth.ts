import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import {
  OAuthProvider,
  OAuthProviderConfig,
} from "../integrations/oauth-provider";
import { paypalEnv } from "./env";
import { paypalAuthTokenSchema, paypalUserInfoSchema } from "./schema";

class PayPalOAuthProvider extends OAuthProvider<typeof paypalAuthTokenSchema> {
  constructor(provider: OAuthProviderConfig) {
    super(provider);
  }

  async getUserInfo(token: string) {
    const response = await fetch(
      `${paypalEnv.PAYPAL_API_HOST}/v1/identity/openidconnect/userinfo?schema=openid`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error("Failed to fetch user info from PayPal.", {
        cause: data,
      });
    }

    return paypalUserInfoSchema.parse(data);
  }
}

export const paypalOAuthProvider = new PayPalOAuthProvider({
  name: "PayPal",
  clientId: paypalEnv.PAYPAL_CLIENT_ID!,
  clientSecret: paypalEnv.PAYPAL_CLIENT_SECRET!,
  authUrl: paypalEnv.PAYPAL_AUTHORIZE_URL,
  tokenUrl: `${paypalEnv.PAYPAL_API_HOST}/v1/oauth2/token`,
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/hubspot/callback`,
  redisStatePrefix: "paypal:oauth:state",
  scopes: ["email"].join(" "),
  tokenSchema: paypalAuthTokenSchema,
  bodyFormat: "form",
});
