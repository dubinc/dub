import { SCOPES } from "@/lib/api/tokens/scopes";
import z from "@/lib/zod";
import { createPartnerSchema } from "./partners";

// Schema to validate the request body when creating a new token
export const createTokenSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .min(1)
    .max(50),
  isMachine: z.boolean().optional().default(false),
  scopes: z.array(z.enum(SCOPES)).default([]).optional(),
});

// Schema to validate the request body when updating a token
export const updateTokenSchema = createTokenSchema
  .pick({
    name: true,
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
    image: z.string().nullable(),
    isMachine: z.boolean(),
  }),
});

export const createReferralsEmbedTokenSchema = z
  .object({
    programId: z.string(),
    partnerId: z.string().optional(),
    tenantId: z.string().optional(),
    partner: createPartnerSchema.omit({ programId: true }).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.partnerId && !data.tenantId && !data.partner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "You must provide either partnerId, tenantId, or partner.",
      });
    }
  });

export const ReferralsEmbedTokenSchema = z.object({
  publicToken: z.string(),
  expires: z.date(),
});
