import * as z from "zod/v4";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb } from "./client";

export const getLeadEvents = tb.buildPipe({
  pipe: "get_lead_events",
  parameters: z.object({
    customerIds: z.string().array(),
  }),
  data: leadEventSchemaTB,
});

export const getLeadEventsWithCache = async ({
  customerIds,
}: {
  customerIds: string[];
}): Promise<LeadEventTB[]> => {
  if (customerIds.length === 0) {
    return [];
  }

  const { data: tbEvents } = await getLeadEvents({ customerIds });

  const foundIds = new Set(tbEvents.map((e) => e.customer_id));
  const missingIds = customerIds.filter((id) => !foundIds.has(id));

  if (missingIds.length === 0) {
    return tbEvents;
  }

  const cached = await Promise.all(
    missingIds.map((id) => redis.get<LeadEventTB>(`leadCache:${id}`)),
  );

  const cachedEvents = cached.filter((e): e is LeadEventTB => e !== null);

  return [...tbEvents, ...cachedEvents];
};
