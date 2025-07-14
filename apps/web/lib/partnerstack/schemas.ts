import { z } from "zod";

export const partnerStackImportSteps = z.enum([
  "import-affiliates",
  "import-links",
  "import-referrals",
  "import-commissions",
  "update-stripe-customers",
]);

export const partnerStackImportPayload = z.object({
  userId: z.string(),
  programId: z.string(),
  action: partnerStackImportSteps,
});
