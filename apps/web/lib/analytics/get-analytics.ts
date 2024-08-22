import { tb } from "@/lib/tinybird";
import { getDaysDifference, linkConstructor } from "@dub/utils";
import { conn } from "../planetscale";
import { prismaEdge } from "../prisma/edge";
import { tbDemo } from "../tinybird/demo-client";
import z from "../zod";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { clickAnalyticsResponse } from "../zod/schemas/clicks-analytics";
import { compositeAnalyticsResponse } from "../zod/schemas/composite-analytics";
import { leadAnalyticsResponse } from "../zod/schemas/leads-analytics";
import { saleAnalyticsResponse } from "../zod/schemas/sales-analytics";
import { INTERVAL_DATA } from "./constants";
import { AnalyticsFilters } from "./types";

const responseSchema = {
  clicks: clickAnalyticsResponse,
  leads: leadAnalyticsResponse,
  sales: saleAnalyticsResponse,
  composite: compositeAnalyticsResponse,
};

// Fetch data for /api/analytics
export const getAnalytics = async (params: AnalyticsFilters) => {
  let {
    event,
    groupBy,
    workspaceId,
    linkId,
    interval,
    start,
    end,
    timezone = "UTC",
    isDemo,
    isDeprecatedClicksEndpoint = false,
  } = params;

  // get all-time clicks count if:
  // 1. type is count
  // 2. linkId is defined
  // 3. interval is all time
  // 4. call is made from dashboard
  if (linkId && groupBy === "count" && interval === "all_unfiltered") {
    const columns =
      event === "composite"
        ? `clicks, leads, sales, saleAmount as amount`
        : event === "sales"
          ? `sales, saleAmount as amount`
          : `${event}`;

    let response = await conn.execute(
      `SELECT ${columns} FROM Link WHERE id = ?`,
      [linkId],
    );

    return response.rows[0];
  }

  let granularity: "minute" | "hour" | "day" | "month" = "day";

  if (start) {
    start = new Date(start);
    end = end ? new Date(end) : new Date(Date.now());

    const daysDifference = getDaysDifference(start, end);

    if (daysDifference <= 2) {
      granularity = "hour";
    } else if (daysDifference > 180) {
      granularity = "month";
    }

    // Swap start and end if start is greater than end
    if (start > end) {
      [start, end] = [end, start];
    }
  } else {
    interval = interval ?? "24h";
    start = INTERVAL_DATA[interval].startDate;
    end = new Date(Date.now());
    granularity = INTERVAL_DATA[interval].granularity;
  }

  // Create a Tinybird pipe
  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: `v1_${groupBy}`,
    parameters: analyticsFilterTB,
    data: groupBy === "top_links" ? z.any() : responseSchema[event][groupBy],
  });

  const response = await pipe({
    ...params,
    eventType: event,
    workspaceId,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
    granularity,
    timezone,
  });

  if (groupBy === "count") {
    // Return the count value for deprecated endpoints
    if (isDeprecatedClicksEndpoint) {
      return response.data[0][event];
      // Return the object for count endpoints
    } else {
      return response.data[0];
    }
  } else if (groupBy === "top_links") {
    const topLinksData = response.data as {
      link: string;
    }[];
    const linkIds = topLinksData.map((item) => item.link);

    const links = await prismaEdge.link.findMany({
      where: {
        projectId: workspaceId,
        id: {
          in: linkIds,
        },
      },
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
        createdAt: true,
      },
    });

    const allLinks = links.map((link) => ({
      id: link.id,
      domain: link.domain,
      key: link.key,
      shortLink: linkConstructor({
        domain: link.domain,
        key: link.key,
      }),
      url: link.url,
      createdAt: link.createdAt,
    }));

    return topLinksData.map((d) => ({
      ...allLinks.find((l) => l.id === d.link),
      ...d,
    }));
  }

  // Return array for other endpoints
  return response.data;
};
