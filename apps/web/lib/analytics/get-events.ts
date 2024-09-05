import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird";
import { Link } from "@prisma/client";
import { tbDemo } from "../tinybird/demo-client";
import {
  transformClickEventData,
  transformLeadEventData,
  transformSaleEventData,
} from "../webhook/transform";
import { eventsFilterTB } from "../zod/schemas/analytics";
import { clickEventEnrichedSchema } from "../zod/schemas/clicks";
import { leadEventEnrichedSchema } from "../zod/schemas/leads";
import { saleEventEnrichedSchema } from "../zod/schemas/sales";
import { INTERVAL_DATA } from "./constants";
import { EventsFilters } from "./types";

// Promise<
// | z.infer<typeof clickEventEnrichedSchema>[]
// | z.infer<typeof leadEventEnrichedSchema>[]
// | z.infer<typeof saleEventEnrichedSchema>[]
// >

// Fetch data for /api/events
export const getEvents = async (params: EventsFilters) => {
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

  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: "v1_events",
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
    offset: params.page * params.limit,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
  });

  const linkIds = response.data.map((d) => d.link_id);

  const links = await prisma.link.findMany({
    where: {
      id: {
        in: linkIds,
      },
    },
    include: {
      tags: true,
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

      return {
        ...event,
        link,
      };
    })
    .filter((d) => d !== null);

  console.log({ events: JSON.stringify(events, null, 2) });

  // Click events
  if (event === "clicks") {
    return events.map((d) =>
      transformClickEventData({
        ...d,
        link: linksMap[d.link_id],
        bot: d.bot === 1,
        qr: d.qr === 1,
      }),
    );
  }

  // Lead events
  if (event === "leads") {
    return response.data.map((d) =>
      transformLeadEventData({
        ...d,
        bot: d.bot === 1,
        qr: d.qr === 1,
        link: linksMap[d.link_id],
        customerId: "d.customer_id", // TODO: fix it,
        customerName: d.customer_name,
        customerEmail: d.customer_email,
        customerAvatar: d.customer_avatar,
      }),
    );
  }

  // Sale events
  if (event === "sales") {
    return response.data.map((d) =>
      transformSaleEventData({
        ...d,
        bot: d.bot === 1,
        qr: d.qr === 1,
        link: linksMap[d.link_id],
        customerId: "d.customer_id",
        customerName: d.customer_name,
        customerEmail: d.customer_email,
        customerAvatar: d.customer_avatar,
      }),
    );
  }

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
      avatar:
        d.customer_avatar ||
        `https://api.dicebear.com/7.x/micah/svg?seed=${d.customer_id}`,
    },
  }));
};
