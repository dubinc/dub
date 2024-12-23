import z from "../zod";
import { saleEventSchemaTB } from "../zod/schemas/sales";
import { tb } from "./client";

export const getSaleEvent = tb.buildPipe({
  pipe: "get_sale_event",
  parameters: z.object({
    eventId: z.string(),
  }),
  data: saleEventSchemaTB,
});
