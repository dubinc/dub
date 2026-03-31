import * as z from "zod/v4";
import { tb } from "./client";

const pipe = tb.buildPipe({
  pipe: "v2_customer_events",
  parameters: z.any(), // TODO
  data: z.any(), // TODO
});

export const getCustomerEventsTB = async ({
  customerId,
  linkIds,
}: {
  customerId: string;
  linkIds?: string[];
}) => {
  return await pipe({
    customerId,
    ...(linkIds ? { linkIds } : {}),
  });
};
