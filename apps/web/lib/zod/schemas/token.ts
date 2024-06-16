import { scopes } from "@/lib/api/api-keys/scopes";
import z from "@/lib/zod";

// Schema to validate the request body when creating a new token
export const createTokenSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .min(1)
    .max(50),
  isMachine: z.boolean().optional().default(false),
  scopes: z.array(z.enum(scopes)).optional(),
});

// Schema to validate the request body when updating a token
export const updateTokenSchema = createTokenSchema
  .pick({
    scopes: true,
  })
  .required();

// Represent the shape of a token returned from the API
export const tokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  partialKey: z.string(),
  scopes: z
    .string()
    .nullable()
    .transform((val) => val?.split(" ") ?? []),
  lastUsed: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    isMachine: z.boolean(),
  }),
});
