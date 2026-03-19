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
  code: z.number(),
  vendorData: z.string(),
  action: z.string(),
});
