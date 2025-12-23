import { tb } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { OG_AVATAR_URL } from "@dub/utils";
import { decodeLinkIfCaseSensitive } from "../api/links/case-sensitivity";
import { transformLink } from "../api/links/utils/transform-link";
import { generateRandomName } from "../names";
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
import { queryParser } from "./query-parser";
import { EventsFilters } from "./types";
import { formatUTCDateTimeClickhouse } from "./utils/format-utc-datetime-clickhouse";
import { getStartEndDates } from "./utils/get-start-end-dates";

// Fetch data for /api/events
export const getEvents = async (params: EventsFilters) => {
  let {
    event: eventType,
    workspaceId,
    interval,
    start,
    end,
    timezone = "UTC",
    qr,
    trigger,
    region,
    country,
    order,
    sortOrder,
    dataAvailableFrom,
    query,
  } = params;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom,
    timezone,
  });

  if (qr) {
    trigger = "qr";
  }

  if (region) {
    const split = region.split("-");
    country = split[0];
    region = split[1];
  }

  // support legacy order param
  if (order && order !== "desc") {
    sortOrder = order;
  }

  const pipe = tb.buildPipe({
    pipe: "v3_events",
    parameters: eventsFilterTB,
    data:
      {
        clicks: clickEventSchemaTBEndpoint,
        leads: leadEventSchemaTBEndpoint,
        sales: saleEventSchemaTBEndpoint,
      }[eventType] ?? clickEventSchemaTBEndpoint,
  });

  const filters = queryParser(query);

  const response = await pipe({
    ...params,
    eventType,
    workspaceId,
    trigger,
    country,
    region,
    order: sortOrder,
    offset: (params.page - 1) * params.limit,
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
    filters: filters ? JSON.stringify(filters) : undefined,
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
      let link = linksMap[evt.link_id];
      if (!link) {
        return null;
      }

      link = decodeLinkIfCaseSensitive(link);

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
        link: transformLink(link, { skipDecodeKey: true }),
        ...(evt.event === "lead" || evt.event === "sale"
          ? {
              eventId: evt.event_id,
              eventName: evt.event_name,
              metadata: evt.metadata ? JSON.parse(evt.metadata) : undefined,
              customer: customersMap[evt.customer_id] ?? {
                id: evt.customer_id,
                name: "Deleted Customer",
                email: "deleted@customer.com",
                avatar: `${OG_AVATAR_URL}${evt.customer_id}`,
                externalId: evt.customer_id,
                createdAt: new Date("1970-01-01"),
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
        externalId: customer.externalId || "",
        name: customer.name || customer.email || generateRandomName(),
        email: customer.email || "",
        avatar: customer.avatar || `${OG_AVATAR_URL}${customer.id}`,
        country: customer.country || "",
        createdAt: customer.createdAt,
      });
      return acc;
    },
    {} as Record<string, z.infer<typeof CustomerSchema>>,
  );
};
