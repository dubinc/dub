import * as z from "zod/v4";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb } from "./client";

export const getLeadEvent = tb.buildPipe({
  pipe: "get_lead_event",
  parameters: z.object({
    customerId: z.string(),
    eventName: z.string().nullish(),
  }),
  data: leadEventSchemaTB,
});
