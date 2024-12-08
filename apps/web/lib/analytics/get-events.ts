import { tb } from "@/lib/tinybird";
import { Link, prisma } from "@dub/prisma";
import { transformLink } from "../api/links";
import { tbDemo } from "../tinybird/demo-client";
import z from "../zod";
import { eventsFilterTB } from "../zod/schemas/analytics";
import {
  clickEventResponseSchema,
  clickEventSchema,
  clickEventSchemaTBEndpoint,
} from "../zod/schemas/clicks";
import { CustomerSchema } from "../zod/schemas/customers";
import {
  leadEventResponseSchema,
  leadEventSchemaTBEndpoint,
} from "../zod/schemas/leads";
import {
  saleEventResponseSchema,
  saleEventSchemaTBEndpoint,
} from "../zod/schemas/sales";
import { EventsFilters } from "./types";
import { getStartEndDates } from "./utils/get-start-end-dates";

// Fetch data for /api/events
export const getEvents = async (params: EventsFilters) => {
  let {
    event: eventType,
    workspaceId,
    interval,
    start,
    end,
    qr,
    trigger,
    region,
    country,
    isDemo,
  } = params;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
  });

  if (trigger) {
    if (trigger === "qr") {
      qr = true;
    } else if (trigger === "link") {
      qr = false;
    }
  }

  if (region) {
    const split = region.split("-");
    country = split[0];
    region = split[1];
  }

  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: "v2_events",
    parameters: eventsFilterTB,
    data:
      {
        clicks: clickEventSchemaTBEndpoint,
        leads: leadEventSchemaTBEndpoint,
        sales: saleEventSchemaTBEndpoint,
      }[eventType] ?? clickEventSchemaTBEndpoint,
  });

  const response = await pipe({
    ...params,
    eventType,
    workspaceId,
    qr,
    country,
    region,
    offset: (params.page - 1) * params.limit,
    start: startDate.toISOString().replace("T", " ").replace("Z", ""),
    end: endDate.toISOString().replace("T", " ").replace("Z", ""),
  });

  const [linksMap, customersMap] = await Promise.all([
    getLinksMap(response.data.map((d) => d.link_id)),
    getCustomersMap(
      response.data
        .map((d) => {
          if (d.event === "lead" || d.event === "sale") {
            return d.customer_id;
          }
          return null;
        })
        .filter(Boolean) as string[],
    ),
  ]);

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
          // normalize processed values
          region: evt.region_processed ?? "",
          refererUrl: evt.referer_url_processed ?? "",
        }),
        // transformLink -> add shortLink, qrCode, workspaceId, etc.
        link: transformLink(link),
        ...(evt.event === "lead" || evt.event === "sale"
          ? {
              eventId: evt.event_id,
              eventName: evt.event_name,
              customer: customersMap[evt.customer_id] ?? {
                id: evt.customer_id,
                name: "Deleted Customer",
                email: "deleted@customer.com",
                avatar: `https://api.dicebear.com/9.x/micah/svg?seed=${evt.customer_id}`,
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

const getLinksMap = async (linkIds: string[]) => {
  const links = await prisma.link.findMany({
    where: {
      id: {
        in: linkIds,
      },
    },
  });

  return links.reduce(
    (acc, link) => {
      acc[link.id] = link;
      return acc;
    },
    {} as Record<string, Link>,
  );
};

const getCustomersMap = async (customerIds: string[]) => {
  if (customerIds.length === 0) {
    return {};
  }

  const customers = await prisma.customer.findMany({
    where: {
      id: {
        in: customerIds,
      },
    },
  });

  return customers.reduce(
    (acc, customer) => {
      acc[customer.id] = CustomerSchema.parse({
        id: customer.id,
        externalId: customer.externalId,
        name: customer.name || "",
        email: customer.email || "",
        avatar:
          customer.avatar ||
          `https://api.dicebear.com/9.x/notionists/png?seed=${customer.id}`,
        createdAt: customer.createdAt,
      });
      return acc;
    },
    {} as Record<string, z.infer<typeof CustomerSchema>>,
  );
};
