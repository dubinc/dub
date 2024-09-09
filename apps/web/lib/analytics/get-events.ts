import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird";
import { Link } from "@prisma/client";
import { transformLink } from "../api/links";
import { tbDemo } from "../tinybird/demo-client";
import { eventsFilterTB } from "../zod/schemas/analytics";
import {
  clickEventEnrichedSchema,
  clickEventResponseSchema,
  clickEventSchema,
} from "../zod/schemas/clicks";
import {
  leadEventEnrichedSchema,
  leadEventResponseSchema,
} from "../zod/schemas/leads";
import {
  saleEventEnrichedSchema,
  saleEventResponseSchema,
} from "../zod/schemas/sales";
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
    pipe: "v2_events",
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
    .map((evt) => {
      const link = linksMap[evt.link_id];
      if (!link) {
        return null;
      }

      const eventData = {
        ...evt,
        // use link domain & key from mysql instead of tinybird
        domain: link.domain,
        key: link.key,
        // timestamp is always in UTC
        timestamp: new Date(evt.timestamp + "Z"),
        click: clickEventSchema.parse({
          ...evt,
          id: evt.click_id,
        }),
        // transformLink -> add shortLink, qrCode, workspaceId, etc.
        link: transformLink(link),
        ...(evt.event === "lead" || evt.event === "sale"
          ? {
              eventId: evt.event_id,
              eventName: evt.event_name,
              customer: {
                name: evt.customer_name,
                email: evt.customer_email,
                avatar:
                  evt.customer_avatar ||
                  `https://api.dicebear.com/7.x/micah/svg?seed=${evt.customer_email}`,
              },
              ...(evt.event === "sale"
                ? {
                    sale: {
                      amount: evt.saleAmount,
                      invoiceId: evt.invoice_id,
                      paymentProcessor: evt.payment_processor,
                    },
                  }
                : {}),
            }
          : {}),
      };

      if (evt.event === "click") {
        return clickEventResponseSchema.parse(eventData);
      } else if (evt.event === "lead") {
        return leadEventResponseSchema.parse(eventData);
      } else if (evt.event === "sale") {
        return saleEventResponseSchema.parse(eventData);
      }

      return eventData;
    })
    .filter((d) => d !== null);

  return events;
};
