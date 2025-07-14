import { z } from "zod";

export const partnerStackImportSteps = z.enum([
  "import-affiliates",
  "import-links",
  "import-referrals",
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
