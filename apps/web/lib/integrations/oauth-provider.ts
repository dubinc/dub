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

    const data = await response.json();

    if (!response.ok) {
      console.error(`[${this.provider.name}] exchangeCodeForToken`, data);

      throw new Error(
        `[${this.provider.name}] Failed to exchange authorization code. Please try again.`,
      );
    }

    const token = this.provider.tokenSchema.parse(data);

    return {
      token,
      contextId,
    };
  }
}

// TODO:
// HubSpot
// Slack
// PayPal
