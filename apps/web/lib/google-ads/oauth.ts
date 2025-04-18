import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { AuthorizationCode } from "simple-oauth2";
import { v4 as uuidv4 } from "uuid";
import { redis } from "../upstash/redis";
import { googleEnv } from "./env";

interface AccessToken {
  token: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}

interface UserInfo {
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
}

const REDIRECT_URI = `${APP_DOMAIN_WITH_NGROK}/api/google/callback`;
const STATE_CACHE_PREFIX = "google:oauth:state:";

export class GoogleOAuth {
  private oauth2: AuthorizationCode;

  constructor() {
    this.oauth2 = new AuthorizationCode({
      client: {
        id: googleEnv.GOOGLE_CLIENT_ID,
        secret: googleEnv.GOOGLE_CLIENT_SECRET,
      },
      auth: {
        tokenHost: googleEnv.GOOGLE_AUTHORIZE_HOST,
        tokenPath: "/o/oauth2/token",
        authorizeHost: googleEnv.GOOGLE_AUTHORIZE_HOST,
        authorizePath: "/o/oauth2/auth",
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
      ex: 60 * 2, // 2 minutes
    });

    return this.oauth2.authorizeURL({
      state,
      scope: [
        "https://www.googleapis.com/auth/adwords",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      redirect_uri: REDIRECT_URI,
      access_type: "offline",
      prompt: "consent",
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

    return {
      accessToken: accessToken.token.access_token,
      refreshToken: accessToken.token.refresh_token,
      expiresIn: accessToken.token.expires_in,
    };
  }

  async getUserInfo({ token }: { token: string }) {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = (await response.json()) as UserInfo;

    if (!response.ok) {
      throw new Error("Failed to fetch user info from Google.", {
        cause: data,
      });
    }

    return data;
  }
}

export const googleOAuth = new GoogleOAuth();
