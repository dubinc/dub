import { tb } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { transformLink } from "../api/links";
import { decodeLinkIfCaseSensitive } from "../api/links/case-sensitivity";
import z from "../zod";
import {
  clickEventResponseSchema,
  clickEventSchema,
} from "../zod/schemas/clicks";
import {
  leadEventResponseSchema,
  leadEventResponseSchemaExtended,
} from "../zod/schemas/leads";
import {
  saleEventResponseSchema,
  saleEventResponseSchemaExtended,
} from "../zod/schemas/sales";

export const getCustomerEvents = async ({
  customerId,
  linkIds,
  includeMetadata,
}: {
  customerId: string;
  linkIds?: string[];
  includeMetadata?: boolean;
}) => {
  const pipe = tb.buildPipe({
    pipe: "v2_customer_events",
    parameters: z.any(), // TODO
    data: z.any(), // TODO
  });

  const response = await pipe({
    customerId,
    ...(linkIds ? { linkIds } : {}),
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

      return {
        click: clickEventResponseSchema,
        lead: (includeMetadata
          ? leadEventResponseSchemaExtended
          : leadEventResponseSchema
        ).omit({ customer: true }),
        sale: (includeMetadata
          ? saleEventResponseSchemaExtended
          : saleEventResponseSchema
        ).omit({ customer: true }),
      }[evt.event].parse(eventData);
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
