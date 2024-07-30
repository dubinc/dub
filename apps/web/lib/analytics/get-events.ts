import { tb } from "@/lib/tinybird";
import { PAGINATION_LIMIT } from "@dub/utils";
import { z } from "zod";
import { tbDemo } from "../tinybird/demo-client";
import { eventsFilterTB } from "../zod/schemas/analytics";
import { clickEventEnrichedSchema } from "../zod/schemas/clicks";
import { leadEventEnrichedSchema } from "../zod/schemas/leads";
import { saleEventEnrichedSchema } from "../zod/schemas/sales";
import { INTERVAL_DATA } from "./constants";
import { EventsFilters } from "./types";

// Fetch data for /api/events
export const getEvents = async (
  params: EventsFilters,
): Promise<
  | z.infer<typeof clickEventEnrichedSchema>[]
  | z.infer<typeof leadEventEnrichedSchema>[]
  | z.infer<typeof saleEventEnrichedSchema>[]
> => {
  let { event, workspaceId, interval, start, end, isDemo } = params;

  if (start) {
    start = new Date(start);
    end = end ? new Date(end) : new Date(Date.now());

    // Swap start and end if start is greater than end
    if (start > end) {
      [start, end] = [end, start];
    }
  } else {
    interval = interval ?? "24h";
    start = INTERVAL_DATA[interval].startDate;
    end = new Date(Date.now());
  }

  // Create a Tinybird pipe
  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: `v1_events`,
    parameters: eventsFilterTB,
    data:
      {
        clicks: clickEventEnrichedSchema,
        leads: leadEventEnrichedSchema,
        sales: saleEventEnrichedSchema,
      }[event] ?? clickEventEnrichedSchema,
  });

  const response = await pipe({
    ...params,
    eventType: event,
    workspaceId,
    offset: params.page * PAGINATION_LIMIT,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
  });

  return response.data.map((d) => ({
    ...d,
    // timestamp is always in UTC
    timestamp: new Date(d.timestamp + "Z"),
    link: {
      id: d.link_id,
      domain: d.domain,
      key: d.key,
      url: d.url,
    },
    customer: {
      name: d.customer_name,
      email: d.customer_email,
      avatar: d.customer_avatar,
    },
  }));
};
