import { z } from "zod";

export const partnerStackImportSteps = z.enum([
  "import-affiliates",
  "import-links",
  "import-customers",
  "import-commissions",
  "update-stripe-customers",
]);

export const partnerStackImportPayloadSchema = z.object({
  userId: z.string(),
  programId: z.string(),
  action: partnerStackImportSteps,
  startingAfter: z.string().optional(),
});

export const partnerStackAffiliate = z.object({
  key: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  address: z.object({
    country: z.string(),
  }),
});

export const partnerStackLink = z.object({
  key: z.string(),
  dest: z.string(),
  url: z.string(),
});

export const partnerStackCustomer = z.object({
  key: z.string(),
  customer_key: z.string().describe("External ID."),
  name: z.string(),
  email: z.string(),
  provider_key: z
    .string()
    .describe("A unique identifier given by a payment provider."),
  test: z.boolean().describe("True if created by a test partner."),
  created_at: z.number(),
  updated_at: z.number(),
});
