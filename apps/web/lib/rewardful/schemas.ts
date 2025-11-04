import { z } from "zod";

export const rewardfulImportSteps = z.enum([
  "import-campaigns",
  "import-partners",
  "import-affiliate-coupons",
  "import-customers",
  "import-commissions",
]);

export const rewardfulImportPayloadSchema = z.object({
  importId: z.string(),
  userId: z.string(),
  programId: z.string(),
  campaignIds: z.array(z.string()),
  action: rewardfulImportSteps,
  page: z.number().optional(),
});
