import * as z from "zod/v4";
import { tb } from "./client";

export const getSaleEvent = tb.buildPipe({
  pipe: "get_sale_event",
  parameters: z.object({
    eventId: z.string(),
  }),
  data: z.any(),
});
