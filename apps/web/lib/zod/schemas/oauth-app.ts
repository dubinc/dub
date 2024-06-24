import { z } from "zod";

export const oAuthAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  website: z.string(),
  redirectUri: z.string(),
  scopes: z.array(z.string()).nullable(),
  clientId: z.string(),
});

export const createOAuthAppSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(255).nullable(),
  website: z.string().url().max(255),
  redirectUri: z.string().url().max(255),
  scopes: z.array(z.string()).nullable(), // TODO: validate scopes and should be array
});

export const updateOAuthAppSchema = createOAuthAppSchema.partial();
