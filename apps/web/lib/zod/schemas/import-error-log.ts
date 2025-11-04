import { z } from "zod";

export const importErrorLogSchema = z.object({
  workspace_id: z.string(),
  import_id: z.string(),
  source: z.enum(["rewardful", "tolt", "partnerstack", "firstpromoter"]),
  entity: z.enum(["partner", "link", "customer", "commission"]),
  entity_id: z.string(),
  code: z.enum([
    "INACTIVE_PARTNER",
    "PARTNER_NOT_FOUND",
    "LINK_NOT_FOUND",
    "CUSTOMER_NOT_FOUND",
    "CUSTOMER_EMAIL_NOT_FOUND",
    "LEAD_NOT_FOUND",
    "CLICK_NOT_FOUND",
    "STRIPE_CUSTOMER_NOT_FOUND",
    "TRANSACTION_NOT_FOUND",
    "SELF_REFERRAL",
    "NOT_SUPPORTED_UNIT",
  ]),
  message: z.string(),
});
