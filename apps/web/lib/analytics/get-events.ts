import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird";
import { Link } from "@prisma/client";
import { transformLink } from "../api/links";
import { tbDemo } from "../tinybird/demo-client";
import { clickEventSchema } from "../webhook/schemas";
import {
  transformClickEventData,
  transformLeadEventData,
  transformLinkEventData,
  transformSaleEventData,
} from "../webhook/transform";
import { eventsFilterTB } from "../zod/schemas/analytics";
import { clickEventEnrichedSchema } from "../zod/schemas/clicks";
import { leadEventEnrichedSchema } from "../zod/schemas/leads";
import { saleEventEnrichedSchema } from "../zod/schemas/sales";
import { INTERVAL_DATA } from "./constants";
import { EventsFilters } from "./types";

// Fetch data for /api/events
export const getEvents = async (params: EventsFilters) => {
  let { event: eventType, workspaceId, interval, start, end, isDemo } = params;

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

  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: "v1_events",
    parameters: eventsFilterTB,
    data:
      {
        clicks: clickEventEnrichedSchema,
        leads: leadEventEnrichedSchema,
        sales: saleEventEnrichedSchema,
      }[eventType] ?? clickEventEnrichedSchema,
  });

  const response = await pipe({
    ...params,
    eventType,
    workspaceId,
    offset: params.page * params.limit,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
  });

  const links = await prisma.link.findMany({
    where: {
      id: {
        in: response.data.map((d) => d.link_id),
      },
    },
  });

  const linksMap = links.reduce(
    (acc, link) => {
      acc[link.id] = link;
      return acc;
    },
    {} as Record<string, Link>,
  );

  const events = response.data
    .map((event) => {
      const link = linksMap[event.link_id];
      if (!link) {
        return null;
      }

      const eventData = {
        ...event,
        // timestamp is always in UTC
        timestamp: new Date(event.timestamp + "Z"),
        link: transformLinkEventData(transformLink(link)),
        ...(eventType === "leads" || eventType === "sales"
          ? {
              click: clickEventSchema.parse({
                ...event,
                id: event.click_id,
              }),
              customer: {
                id: event.customer_id,
                name: event.customer_name,
                email: event.customer_email,
                avatar:
                  event.customer_avatar ||
                  `https://api.dicebear.com/7.x/micah/svg?seed=${event.customer_id}`,
              },
              ...(eventType === "sales"
                ? {
                    sale: {
                      amount: event.saleAmount,
                      invoiceId: event.invoice_id,
                      paymentProcessor: event.payment_processor,
                      metadata: event.metadata,
                    },
                  }
                : {}),
            }
          : {}),
      };

      if (event === "clicks") {
        return transformClickEventData(eventData);
      } else if (event === "leads") {
        return transformLeadEventData(eventData);
      } else if (event === "sales") {
        return transformSaleEventData(eventData);
      }

      return eventData;
    })
    .filter((d) => d !== null);

  return events;
};
