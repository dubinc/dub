import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { OAuthProvider } from "../oauth-provider";

export const bitlyOAuthProvider = new OAuthProvider({
  name: "Bitly",
  clientId: process.env.BITLY_CLIENT_ID!,
  clientSecret: process.env.BITLY_CLIENT_SECRET!,
  authUrl: "https://bitly.com/oauth/authorize",
  tokenUrl: "https://api-ssl.bitly.com/oauth/access_token",
  redirectUri: `${APP_DOMAIN_WITH_NGROK}/api/callback/bitly`,
  redisStatePrefix: "bitly:oauth:state",
  tokenSchema: z.string(),
  bodyFormat: "form",
  authorizationMethod: "body",
  responseFormat: "text",
});
