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
  scopes?: string;
  redisStatePrefix: string;
  tokenSchema: z.ZodSchema;
  bodyFormat: "form" | "json";
  responseFormat?: "json" | "text";
  authorizationMethod: "header" | "body";
}

const codeExchangeSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export class OAuthProvider<T extends z.ZodSchema> {
  constructor(private provider: OAuthProviderConfig) {}

  // Generate the authorization URL for the OAuth provider
  async generateAuthUrl(contextId: string | Record<string, string>) {
    const state = nanoid(16);
    await redis.set(`${this.provider.redisStatePrefix}:${state}`, contextId, {
      ex: 30 * 60,
    });

    const searchParams = new URLSearchParams({
      client_id: this.provider.clientId,
      redirect_uri: this.provider.redirectUri,
      ...(this.provider.scopes ? { scope: this.provider.scopes } : {}),
      response_type: "code",
      state,
    });

    return `${this.provider.authUrl}?${searchParams.toString()}`;
  }

  // Exchange the authorization code for a token
  async exchangeCodeForToken<K>(request: Request): Promise<{
    contextId: K;
    token: z.infer<T>;
  }> {
    const { code, state } = codeExchangeSchema.parse(
      getSearchParams(request.url),
    );

    const contextId = await redis.getdel<K>(
      `${this.provider.redisStatePrefix}:${state}`,
    );

    if (!contextId) {
      throw new Error(`[${this.provider.name}] Invalid or expired state.`);
    }

    let body: BodyInit;
    let headers: Record<string, string> = {};

    if (this.provider.authorizationMethod === "header") {
      const credentials = Buffer.from(
        `${this.provider.clientId}:${this.provider.clientSecret}`,
        "utf8",
      ).toString("base64");

      headers["Authorization"] = `Basic ${credentials}`;
    }

    switch (this.provider.bodyFormat) {
      case "form": {
        headers["Content-Type"] = "application/x-www-form-urlencoded";

        const formParams = new URLSearchParams({
          code,
          redirect_uri: this.provider.redirectUri,
          grant_type: "authorization_code",
        });

        if (this.provider.authorizationMethod === "body") {
          formParams.append("client_id", this.provider.clientId);
          formParams.append("client_secret", this.provider.clientSecret);
        }

        body = formParams.toString();
        break;
      }

      case "json": {
        headers["Content-Type"] = "application/json";

        const jsonBody: Record<string, string> = {
          code,
          redirect_uri: this.provider.redirectUri,
          grant_type: "authorization_code",
        };

        if (this.provider.authorizationMethod === "body") {
          jsonBody.client_id = this.provider.clientId;
          jsonBody.client_secret = this.provider.clientSecret;
        }

        body = JSON.stringify(jsonBody);
        break;
      }

      default:
        throw new Error(`Unsupported bodyFormat: ${this.provider.bodyFormat}`);
    }

    const response = await fetch(this.provider.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    const responseFormat = this.provider.responseFormat || "json";

    const data =
      responseFormat === "json" ? await response.json() : await response.text();

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

    const responseFormat = this.provider.responseFormat || "json";

    const data =
      responseFormat === "json" ? await response.json() : await response.text();

    if (!response.ok) {
      console.error(`[${this.provider.name}] refreshToken`, data);

      throw new Error(
        `[${this.provider.name}] Failed to refresh the access token. Please try again.`,
      );
    }

    return this.provider.tokenSchema.parse(data);
  }
}
