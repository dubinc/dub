import * as z from "zod/v4";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { leadEventSchemaTB } from "../zod/schemas/leads";
import { tb } from "./client";

export const getLeadEventTB = tb.buildPipe({
  pipe: "get_lead_event",
  parameters: z.object({
    customerId: z.string(),
    eventName: z.string().nullish(),
  }),
  data: leadEventSchemaTB,
});

export const getLeadEvent = async ({
  customerId,
  eventName,
}: {
  customerId: string;
  eventName?: string | null;
}) => {
  const cachedLeadEvent = await redis.get<LeadEventTB>(
    `leadCache:${customerId}${eventName ? `:${eventName.toLowerCase().replaceAll(" ", "-")}` : ""}`,
  );

  if (cachedLeadEvent) {
    return cachedLeadEvent;
  }

  try {
    const { data } = await getLeadEventTB({ customerId, eventName });
    return data[0];
  } catch (error) {
    console.error(
      `[getLeadEvent] Error getting lead event for customerId: ${customerId}${eventName ? ` and eventName: ${eventName}` : ""}`,
      error,
    );
    return null;
  }
};
