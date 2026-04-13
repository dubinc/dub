import * as z from "zod/v4";

// POST /v1/sessions request body
export const veriffCreateSessionInputSchema = z.object({
  verification: z.object({
    vendorData: z.string(),
    person: z.object({
      firstName: z.string(),
      lastName: z.string(),
    }),
  }),
});

// POST /v1/sessions response
export const veriffCreateSessionOutputSchema = z.object({
  status: z.enum(["success"]),
  verification: z.object({
    id: z.string(),
    url: z.string(),
    host: z.string(),
    status: z.string(),
    sessionToken: z.string(),
  }),
});

// Session webhook payload
export const veriffSessionEventSchema = z.object({
  id: z.string(),
  code: z.number(),
  vendorData: z.string(),
  action: z.enum(["started", "submitted"]),
});

// Decision webhook payload
export const veriffDecisionEventSchema = z.object({
  verification: z.object({
    id: z.string(),
    vendorData: z.string(),
    decisionTime: z.string().nullable(),
    attemptId: z.string(),
    status: z.enum([
      "approved",
      "declined",
      "expired",
      "resubmission_requested",
      "abandoned",
      "review",
    ]),
    reason: z.string().nullable(),
    reasonCode: z.number().nullable(),
    person: z
      .object({
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        dateOfBirth: z.string().nullable(),
        nationality: z.string().nullable(),
        idNumber: z.string().nullable(),
      })
      .optional(),
    document: z
      .object({
        number: z.string().nullable(),
        type: z.string().nullable(),
        country: z.string().nullable(),
      })
      .optional(),
  }),
});

export type VeriffDecisionEvent = z.infer<typeof veriffDecisionEventSchema>;

export const veriffEventSchema = z.union([
  veriffSessionEventSchema,
  veriffDecisionEventSchema,
]);
