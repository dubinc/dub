import { OAUTH_SCOPES } from "@/lib/api/oauth/constants";
import { z } from "zod";
import { createIntegrationSchema, integrationSchema } from "./integration";

export const oAuthAppSchema = integrationSchema.merge(
  z.object({
    clientId: z.string(),
    partialClientSecret: z.string(),
    redirectUris: z.array(z.string()),
    pkce: z.boolean(),
  }),
);

export const createOAuthAppSchema = createIntegrationSchema.merge(
  z.object({
    redirectUris: z
      .string()
      .array()
      .min(1, {
        message: "At least one redirect URI is required",
      })
      .max(5, {
        message: "only 5 redirect URIs are allowed",
      })
      .refine(
        (urls) => {
          return urls.every(
            (url) =>
              url.startsWith("https://") || url.startsWith("http://localhost"),
          );
        },
        {
          message:
            "redirect_uri must be a valid URL starting with 'https://' except for 'http://localhost'",
        },
      ),
    pkce: z.boolean().default(false),
  }),
);

export const updateOAuthAppSchema = createOAuthAppSchema.partial();

// Schema for OAuth2.0 Authorization request
export const authorizeRequestSchema = z.object({
  client_id: z.string().min(1, "Missing client_id"),
  redirect_uri: z.string().url({ message: "redirect_uri must be a valid URL" }),
  response_type: z.string().refine((responseType) => responseType === "code", {
    message: "response_type must be 'code'",
  }),
  state: z.string().max(1024).optional(),
  scope: z
    .string()
    .nullable()
    .transform((scope) => {
      const scopes = [...new Set(scope?.split(/[,\s]/).filter(Boolean))];

      if (!scopes.includes("user.read")) {
        scopes.push("user.read");
      }

      return scopes;
    })
    .refine((scopes) => scopes.every((scope) => OAUTH_SCOPES.includes(scope)), {
      message: "Invalid scopes",
    }),
  code_challenge: z.string().max(190).optional(),
  code_challenge_method: z
    .string()
    .refine((method) => method === "S256", {
      message: "code_challenge_method must be 'S256'",
    })
    .optional(),
});

// Schema for OAuth2.0 code exchange request
export const authCodeExchangeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  code: z.string().min(1, "Missing code"),
  redirect_uri: z.string().url({ message: "redirect_uri must be a valid URL" }),
  code_verifier: z.string().max(190).optional(),
});

// Schema for OAuth2.0 token refresh request
export const refreshTokenSchema = z.object({
  grant_type: z.literal("refresh_token"),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  refresh_token: z.string().min(1, "Missing refresh_token"),
});

// Token grant schema
export const tokenGrantSchema = z.discriminatedUnion(
  "grant_type",
  [authCodeExchangeSchema, refreshTokenSchema],
  {
    errorMap: () => ({
      message: "grant_type must be 'authorization_code' or 'refresh_token'",
    }),
  },
);
