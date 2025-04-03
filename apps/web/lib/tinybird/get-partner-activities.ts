import { z } from "zod";
import { tb } from "./client";
import { partnerActivitySchema } from "./record-partner-activity";

export const getPartnerActivities = tb.buildPipe({
  pipe: "get_partner_activities",
  parameters: z.object({
    programId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  data: partnerActivitySchema,
});
