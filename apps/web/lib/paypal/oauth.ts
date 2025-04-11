import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { AuthorizationCode } from "simple-oauth2";
import { v4 as uuidv4 } from "uuid";
import { redis } from "../upstash/redis";
import { paypalEnv } from "./env";

interface AccessToken {
  token: {
    access_token: string;
  };
}

interface UserInfo {
  email: string;
  verified: boolean;
  email_verified: boolean;
}

const oauth2 = new AuthorizationCode({
  client: {
    id: paypalEnv.PAYPAL_CLIENT_ID,
    secret: paypalEnv.PAYPAL_CLIENT_SECRET,
  },
  auth: {
    tokenHost: paypalEnv.PAYPAL_API_HOST,
    tokenPath: "/v1/oauth2/token",
    authorizeHost: paypalEnv.PAYPAL_AUTHORIZE_HOST,
    authorizePath: "/signin/authorize",
  },
  options: {
    authorizationMethod: "header",
    bodyFormat: "form",
  },
});

const REDIRECT_URI = `${APP_DOMAIN_WITH_NGROK}/api/paypal/callback`;
const STATE_CACHE_PREFIX = "paypal:oauth:state:";

export async function getAuthorizationUrl({
  dubUserId,
}: {
  dubUserId: string;
}): Promise<string> {
  const state = uuidv4();

  await redis.set(`${STATE_CACHE_PREFIX}${state}`, dubUserId, {
    ex: 60 * 2, // 2 minutes
  });

  return oauth2.authorizeURL({
    state,
    scope: ["email"],
    redirect_uri: REDIRECT_URI,
  });
}

export async function verifyState({
  state,
  dubUserId,
}: {
  state: string;
  dubUserId: string;
}) {
  return (await redis.get(`${STATE_CACHE_PREFIX}${state}`)) === dubUserId;
}

// Exchanges the authorization code for an access token
export async function exchangeCodeForToken({ code }: { code: string }) {
  const accessToken: AccessToken = await oauth2.getToken({
    code,
    redirect_uri: REDIRECT_URI,
  });

  return accessToken.token.access_token;
}

// Fetch the user info
export async function getUserInfo({ token }: { token: string }) {
  const response = await fetch(
    `${paypalEnv.PAYPAL_API_HOST}/v1/identity/openidconnect/userinfo?schema=openid`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  const data = (await response.json()) as UserInfo;

  if (!response.ok) {
    throw new Error("Failed to fetch user info from PayPal.", {
      cause: data,
    });
  }

  return data;
}
