import * as z from "zod/v4";
import { tb } from "../../lib/tinybird/client";

export const getSaleEvents = tb.buildPipe({
  pipe: "internal_get_sale_events",
  parameters: z.object({
    customerId: z.string(),
  }),
  data: z.any(),
});
