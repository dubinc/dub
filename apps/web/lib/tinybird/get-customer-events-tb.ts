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
  limit,
}: {
  customerId: string;
  linkIds?: string[];
  limit?: number;
}) => {
  return await pipe({
    customerId,
    ...(linkIds ? { linkIds } : {}),
    ...(limit ? { limit } : {}),
  });
};
