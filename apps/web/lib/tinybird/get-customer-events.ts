import z from "../zod";
import { customerEventsSchemaTB } from "../zod/schemas/customers";
import { tb } from "./client";

// We only fetch lead and click events from TB
export const getCustomerEvents = tb.buildPipe({
  pipe: "get_customer_events",
  parameters: z.object({
    customerId: z.string(),
  }),
  data: customerEventsSchemaTB,
});
