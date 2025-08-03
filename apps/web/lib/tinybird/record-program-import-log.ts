import { z } from "zod";
import { tb } from "./client";

export const programImportLogSchema = z.object({
  workspace_id: z.string(),
  import_id: z.string(),
  source: z.enum(["rewardful", "tolt", "partnerstack"]),
  entity: z.enum(["partner", "link", "customer", "commission"]),
  entity_id: z.string(),
  code: z.enum([
    "PARTNER_NOT_IMPORTED",
    "REFERRAL_NOT_IN_CAMPAIGN",
    "LINK_NOT_FOUND",
    "STRIPE_CUSTOMER_ID_NOT_FOUND",
    "AFFILIATE_NOT_IN_CAMPAIGN",
    "COMMISSION_ALREADY_EXISTS",
    "CUSTOMER_NOT_FOUND",
    "CLICK_NOT_FOUND",
    "PARTNER_NOT_FOUND",
    "LEAD_EVENT_NOT_FOUND",
  ]),
  message: z.string(),
});

// Logs skipped program import records from external sources
// Useful for debugging and tracking import issues.
const recordProgramImportLogTB = tb.buildIngestEndpoint({
  datasource: "dub_program_import_log",
  event: programImportLogSchema,
});

export const recordProgramImportLog = async (
  logs: z.infer<typeof programImportLogSchema>[],
) => {
  if (logs.length === 0) {
    return;
  }

  console.log("importLogs", logs.length);

  await recordProgramImportLogTB(logs);
};
