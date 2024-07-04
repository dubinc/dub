import { availableScopes } from "@/lib/api/tokens/scopes";
import { z } from "zod";

export const oAuthClientSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  website: z.string(),
  redirectUri: z.string(),
  scopes: z
    .string()
    .nullable()
    .transform((val) => val?.split(" ") ?? []),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createOAuthClientSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(255).nullable(),
  website: z.string().url().max(255),
  redirectUri: z.string().url().max(255),
  scopes: z.array(z.enum(availableScopes)).default([]).optional(),
});

export const updateOAuthClientSchema = createOAuthClientSchema.partial();

// Schema for OAuth2.0 Authorization request
export const authorizeRequestSchema = z.object({
  client_id: z.string().min(1, "Missing client_id"),
  redirect_uri: z.string().url({ message: "redirect_uri must be a valid URL" }),
  response_type: z.string().refine((responseType) => responseType === "code", {
    message: "response_type must be 'code'",
  }),
  state: z.string().max(255).optional(),
});

// Aprove OAuth2.0 Authorization request
export const approveAuthorizeRequestSchema = authorizeRequestSchema.extend({
  workspaceId: z
    .string()
    .min(1, "Please select a workspace to authorize the app"),
});

// Schema for OAuth2.0 code exchange request
export const authCodeExchangeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  code: z.string().min(1, "Missing code"),
  redirect_uri: z.string().url({ message: "redirect_uri must be a valid URL" }),
});

// Schema for OAuth2.0 token refresh request
export const refreshTokenSchema = z.object({
  grant_type: z.literal("refresh_token"),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  refresh_token: z.string().min(1, "Missing refresh_token"),
});

export const tokenGrantSchema = z.discriminatedUnion(
  "grant_type",
  [authCodeExchangeSchema, refreshTokenSchema],
  {
    errorMap: () => ({
      message: "grant_type must be 'authorization_code' or 'refresh_token'",
    }),
  },
);
