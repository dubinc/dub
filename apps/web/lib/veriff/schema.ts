import * as z from "zod/v4";

// POST /v1/sessions request body
export const veriffCreateSessionBodySchema = z.object({
  verification: z.object({
    person: z.object({
      firstName: z.string(),
      lastName: z.string(),
    }),
    vendorData: z.string().optional(),
    endUserId: z.string().optional(),
  }),
});

// POST /v1/sessions response
export const veriffCreateSessionResponseSchema = z.object({
  status: z.string(),
  verification: z.object({
    id: z.string(),
    url: z.string(),
    host: z.string(),
    status: z.string(),
    sessionToken: z.string(),
  }),
});

// Decision webhook payload
export const veriffDecisionWebhookSchema = z.object({
  status: z.string(),
  verification: z.object({
    id: z.string(),
    code: z.number(),
    status: z.string(),
    person: z
      .object({
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        dateOfBirth: z.string().nullable().optional(),
      })
      .optional(),
    document: z
      .object({
        type: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
      })
      .optional(),
    vendorData: z.string().nullable().optional(),
  }),
});

export type VeriffCreateSessionBody = z.infer<
  typeof veriffCreateSessionBodySchema
>;
export type VeriffCreateSessionResponse = z.infer<
  typeof veriffCreateSessionResponseSchema
>;
export type VeriffDecisionWebhook = z.infer<
  typeof veriffDecisionWebhookSchema
>;
