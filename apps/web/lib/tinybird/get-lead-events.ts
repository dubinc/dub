import z from "../zod";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb } from "./client";

export const getLeadEvents = tb.buildPipe({
  pipe: "get_lead_events",
  parameters: z.object({
    customerIds: z.string().array(),
  }),
  data: leadEventSchemaTB,
});
