import { getSearchParams, nanoid } from "@dub/utils";

import { z } from "zod";
import { redis } from "../upstash";

export interface OAuthProviderConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
  redisStatePrefix: string;
  tokenSchema: z.ZodSchema;
}

const codeExchangeSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export class OAuthProvider<T extends z.ZodSchema> {
  constructor(private provider: OAuthProviderConfig) {}

  // Generate the authorization URL for the OAuth provider
  async generateAuthUrl(contextId: string) {
    const state = nanoid(16);
    await redis.set(`${this.provider.redisStatePrefix}:${state}`, contextId, {
      ex: 30 * 60,
    });

    const searchParams = new URLSearchParams({
      client_id: this.provider.clientId,
      redirect_uri: this.provider.redirectUri,
      scope: this.provider.scopes.join(" "),
      response_type: "code",
      state,
    });

    return `${this.provider.authUrl}?${searchParams.toString()}`;
  }

  // Exchange the authorization code for a token
  async exchangeCodeForToken(request: Request): Promise<{
    contextId: string;
    token: z.infer<T>;
  }> {
    const { code, state } = codeExchangeSchema.parse(
      getSearchParams(request.url),
    );

    const stateKey = `${this.provider.redisStatePrefix}:${state}`;
    const contextId = await redis.getdel<string>(stateKey);

    if (!contextId) {
      throw new Error(`[${this.provider.name}] Invalid or expired state.`);
    }

    const response = await fetch(this.provider.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: this.provider.clientId,
        client_secret: this.provider.clientSecret,
        redirect_uri: this.provider.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`[${this.provider.name}] exchangeCodeForToken`, result);

      throw new Error(
        `[${this.provider.name}] Failed to exchange authorization code. Please try again.`,
      );
    }

    const token = this.provider.tokenSchema.parse(result);

    return {
      token,
      contextId,
    };
  }

  // Refresh the token
  async refreshToken(refreshToken: string): Promise<z.infer<T>> {
    const response = await fetch(this.provider.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.provider.clientId,
        client_secret: this.provider.clientSecret,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`[${this.provider.name}] refreshToken`, result);

      throw new Error(
        `[${this.provider.name}] Failed to refresh the access token. Please try again.`,
      );
    }

    return this.provider.tokenSchema.parse(result);
  }
}
