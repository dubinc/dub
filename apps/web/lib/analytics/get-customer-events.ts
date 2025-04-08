import { tb } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { transformLink } from "../api/links";
import { decodeLinkIfCaseSensitive } from "../api/links/case-sensitivity";
import { generateRandomName } from "../names";
import z from "../zod";
import { clickEventSchema } from "../zod/schemas/clicks";
import { CustomerSchema } from "../zod/schemas/customers";
import { EventsFilters } from "./types";
import { getStartEndDates } from "./utils/get-start-end-dates";

export const getCustomerEvents = async (
  { customerId, clickId }: { customerId: string; clickId?: string | null },
  params: Pick<
    EventsFilters,
    "sortOrder" | "start" | "end" | "dataAvailableFrom" | "interval"
  >,
) => {
  let { sortOrder, start, end, dataAvailableFrom, interval } = params;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom,
  });

  const pipe = tb.buildPipe({
    pipe: "v2_customer_events",
    parameters: z.any(), // TODO
    data: z.any(), // TODO
  });

  const response = await pipe({
    ...params,
    customerId,
    ...(clickId ? { clickId } : {}),
    order: sortOrder,
    start: startDate.toISOString().replace("T", " ").replace("Z", ""),
    end: endDate.toISOString().replace("T", " ").replace("Z", ""),
  });

  const linksMap = await getLinksMap(response.data.map((d) => d.link_id));

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

      // TODO
      // return z
      //   .discriminatedUnion("event", [
      //     clickEventResponseSchema,
      //     leadEventResponseSchema,
      //     saleEventResponseSchema,
      //   ])
      //   .parse(eventData);
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
        avatar: customer.avatar || `${DICEBEAR_AVATAR_URL}${customer.id}`,
        country: customer.country || "",
        createdAt: customer.createdAt,
      });
      return acc;
    },
    {} as Record<string, z.infer<typeof CustomerSchema>>,
  );
};
