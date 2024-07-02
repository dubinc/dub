import { availableScopes } from "@/lib/api/tokens/scopes";
import { z } from "zod";

export const oAuthAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  website: z.string(),
  redirectUri: z.string(),
  scopes: z
    .string()
    .nullable()
    .transform((val) => val?.split(" ") ?? []),
  clientId: z.string(),
});

export const createOAuthAppSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(255).nullable(),
  website: z.string().url().max(255),
  redirectUri: z.string().url().max(255),
  scopes: z.array(z.enum(availableScopes)).default([]).optional(),
});

export const updateOAuthAppSchema = createOAuthAppSchema.partial();

// Schema for OAuth2.0 Authorization request
export const authorizeSchema = z.object({
  client_id: z.string().min(1, "Missing client_id"),
  redirect_uri: z.string().url({ message: "redirect_uri must be a valid URL" }),
  response_type: z.string().refine((responseType) => responseType === "code", {
    message: "response_type must be 'code'",
  }),
  state: z.string().max(255).optional(),
});

// Schema for OAuth2.0 code exchange request
export const codeExchangeSchema = z.object({
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  code: z.string().min(1, "Missing code"),
  redirect_uri: z.string().url({ message: "redirect_uri must be a valid URL" }),
  grant_type: z
    .literal("authorization_code")
    .refine((grantType) => grantType === "authorization_code", {
      message: "grant_type must be 'authorization_code'",
    }),
});

// Schema for OAuth2.0 token refresh request
export const tokenRefreshSchema = z.object({
  client_id: z.string().min(1, "Missing client_id"),
  client_secret: z.string().min(1, "Missing client_secret"),
  refresh_token: z.string().min(1, "Missing refresh_token"),
  grant_type: z
    .literal("refresh_token")
    .refine((grantType) => grantType === "refresh_token", {
      message: "grant_type must be 'refresh_token'",
    }),
});
