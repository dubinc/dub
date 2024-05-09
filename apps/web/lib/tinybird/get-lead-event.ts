import z from "../zod";
import { leadEventSchemaTB } from "../zod/schemas";
import { tb } from "./client";

export const getLeadEvent = tb.buildPipe({
  pipe: "get_lead_event",
  parameters: z.object({
    customer_id: z.string(),
  }),
  data: leadEventSchemaTB,
});
