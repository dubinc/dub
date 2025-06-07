import { PARTNERS_DOMAIN_WITH_NGROK } from "@dub/utils";
import { AuthorizationCode } from "simple-oauth2";
import { v4 as uuidv4 } from "uuid";
import { redis } from "../upstash/redis";
import { paypalEnv } from "./env";

interface AccessToken {
  token: {
    access_token: string;
  };
}

interface PayPalUserInfo {
  email: string;
  email_verified: boolean; // Indicates whether the user's paypal email address is verified.
}

const REDIRECT_URI = `${PARTNERS_DOMAIN_WITH_NGROK}/api/paypal/callback`;
const STATE_CACHE_PREFIX = "paypal:oauth:state:";

export class PayPalOAuth {
  private oauth2: AuthorizationCode;

  constructor() {
    this.oauth2 = new AuthorizationCode({
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
  }

  async getAuthorizationUrl({
    dubUserId,
  }: {
    dubUserId: string;
  }): Promise<string> {
    const state = uuidv4();

    await redis.set(`${STATE_CACHE_PREFIX}${state}`, dubUserId, {
      ex: 60 * 5, // 5 minutes
    });

    return this.oauth2.authorizeURL({
      state,
      scope: ["email"],
      redirect_uri: REDIRECT_URI,
    });
  }

  async verifyState({
    state,
    dubUserId,
  }: {
    state: string;
    dubUserId: string;
  }) {
    return (await redis.get(`${STATE_CACHE_PREFIX}${state}`)) === dubUserId;
  }

  async exchangeCodeForToken({ code }: { code: string }) {
    const accessToken: AccessToken = await this.oauth2.getToken({
      code,
      redirect_uri: REDIRECT_URI,
    });

    return accessToken.token.access_token;
  }

  async getUserInfo({ token }: { token: string }) {
    const response = await fetch(
      `${paypalEnv.PAYPAL_API_HOST}/v1/identity/openidconnect/userinfo?schema=openid`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const data = (await response.json()) as PayPalUserInfo;

    if (!response.ok) {
      throw new Error("Failed to fetch user info from PayPal.", {
        cause: data,
      });
    }

    return data;
  }
}

export const paypalOAuth = new PayPalOAuth();
