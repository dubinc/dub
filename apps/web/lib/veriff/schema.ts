import * as z from "zod/v4";

// POST /v1/sessions request body
export const veriffCreateSessionInputSchema = z.object({
  verification: z.object({
    vendorData: z.string(),
    person: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
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

// Event webhook payload
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
    status: z.enum([
      "approved",
      "declined",
      "expired",
      "resubmission_requested",
      "abandoned",
      "review",
    ]),
    reason: z.string().optional(),
    reasonCode: z.number().optional(),
    person: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        nationality: z.string().optional(),
        idNumber: z.string().optional(),
      })
      .optional(),
    document: z
      .object({
        number: z.string().optional(),
        type: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
  }),
});

export const veriffEventSchema = z.union([
  veriffSessionEventSchema,
  veriffDecisionEventSchema,
]);
