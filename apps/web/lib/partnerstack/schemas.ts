import { z } from "zod";

export const partnerStackImportSteps = z.enum([
  "import-partners",
  "import-links",
  "import-customers",
  "import-commissions",
  "update-stripe-customers",
]);

export const partnerStackCredentialsSchema = z.object({
  publicKey: z.string().min(1),
  secretKey: z.string().min(1),
});

export const partnerStackImportPayloadSchema = z.object({
  importId: z.string(),
  userId: z.string(),
  programId: z.string(),
  action: partnerStackImportSteps,
  startingAfter: z.string().optional(),
});

export const partnerStackPartner = z.object({
  key: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  address: z
    .object({
      country: z.string().nullable(),
    })
    .nullable(),
  stats: z.object({
    CUSTOMER_COUNT: z
      .number()
      .describe("Only import if CUSTOMER_COUNT is greater than 0."),
  }),
});

export const partnerStackLink = z.object({
  key: z.string(),
  dest: z.string(),
  url: z.string(),
});

export const partnerStackCustomer = z.object({
  key: z.string(),
  name: z.string(),
  email: z.string(),
  provider_key: z
    .string()
    .nullable()
    .describe("A unique identifier given by a payment provider."),
  customer_key: z
    .string()
    .nullable()
    .describe("External customer key that can be configured on creation."),
  test: z.boolean().describe("True if created by a test."),
  partnership_key: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const partnerStackCommission = z.object({
  key: z.string(),
  amount: z.number().describe("The amount of the reward in cents (USD)."),
  currency: z.string(),
  created_at: z.number(),
  customer: z
    .object({
      email: z.string(),
      external_key: z.string().nullable(),
    })
    .nullable(),
  transaction: z
    .object({
      amount: z.number().describe("The amount of the transaction."),
      currency: z.string(),
    })
    .nullable(),
  reward_status: z.enum(["hold", "pending", "approved", "declined", "paid"]),
});
