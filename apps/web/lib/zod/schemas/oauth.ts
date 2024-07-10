import { availableScopes } from "@/lib/api/tokens/scopes";
import { z } from "zod";

export const oAuthAppSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string().optional(),
  name: z.string(),
  developer: z.string(),
  website: z.string(),
  redirectUri: z.string(),
  scopes: z
    .string()
    .nullable()
    .transform((val) => val?.split(" ") ?? []),
});

export const createOAuthClientSchema = z.object({
  name: z.string().min(1).max(255),
  developer: z.string().min(1).max(255),
  website: z
    .string()
    .url({
      message: "website must be a valid URL",
    })
    .max(255),
  redirectUri: z
    .string()
    .url({ message: "redirect_uri must be a valid URL" })
    .max(255)
    .refine(
      (url) => {
        if (url.startsWith("http://localhost")) {
          return true;
        }

        return url.startsWith("https://");
      },
      {
        message:
          "redirect_uri must be a valid URL starting with 'https://' except for 'http://localhost'",
      },
    ),
  scopes: z
    .array(z.enum(availableScopes))
    .min(1, "An OAuth app must have at least one scope"),
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

export const oAuthAuthorizedAppSchema = z
  .object({
    id: z.string(),
    createdAt: z.date(),
    user: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })
  .merge(
    oAuthAppSchema.pick({
      clientId: true,
      name: true,
      developer: true,
      website: true,
    }),
  );
