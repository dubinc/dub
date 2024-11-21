import { combineTagIds } from "@/lib/api/tags/combine-tag-ids";
import { tb } from "@/lib/tinybird";
import { linkConstructor, punyEncode } from "@dub/utils";
import { conn } from "../planetscale";
import { prismaEdge } from "../prisma/edge";
import { tbDemo } from "../tinybird/demo-client";
import z from "../zod";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { analyticsResponse } from "../zod/schemas/analytics-response";
import { AnalyticsFilters } from "./types";
import { getStartEndDates } from "./utils/get-start-end-dates";

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
    qr,
    trigger,
    timezone = "UTC",
    isDemo,
    isDeprecatedClicksEndpoint = false,
    region,
    country,
  } = params;

  const tagIds = combineTagIds(params);

  // get all-time clicks count if:
  // 1. type is count
  // 2. linkId is defined
  // 3. interval is all time
  // 4. call is made from dashboard
  if (linkId && groupBy === "count" && interval === "all_unfiltered") {
    const columns =
      event === "composite"
        ? `clicks, leads, sales, saleAmount`
        : event === "sales"
          ? `sales, saleAmount`
          : `${event}`;

    let response = await conn.execute(
      `SELECT ${columns} FROM Link WHERE id = ?`,
      [linkId],
    );

    return response.rows[0];
  }

  if (groupBy === "trigger") {
    groupBy = "triggers";
  }

  const { startDate, endDate, granularity } = getStartEndDates({
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

  // Create a Tinybird pipe
  const pipe = (isDemo ? tbDemo : tb).buildPipe({
    pipe: `v2_${groupBy}`,
    parameters: analyticsFilterTB,
    data: groupBy === "top_links" ? z.any() : analyticsResponse[groupBy],
  });

  const response = await pipe({
    ...params,
    eventType: event,
    workspaceId,
    tagIds,
    qr,
    start: startDate.toISOString().replace("T", " ").replace("Z", ""),
    end: endDate.toISOString().replace("T", " ").replace("Z", ""),
    granularity,
    timezone,
    country,
    region,
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

    const links = await prismaEdge.link.findMany({
      where: {
        projectId: workspaceId,
        id: {
          in: topLinksData.map((item) => item.link),
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

    return topLinksData
      .map((topLink) => {
        const link = links.find((l) => l.id === topLink.link);
        if (!link) {
          return null;
        }
        return analyticsResponse[groupBy].parse({
          id: link.id,
          domain: link.domain,
          key: punyEncode(link.key),
          url: link.url,
          shortLink: linkConstructor({
            domain: link.domain,
            key: punyEncode(link.key),
          }),
          createdAt: link.createdAt.toISOString(),
          ...topLink,
        });
      })
      .filter((d) => d !== null);
  }

  // Return array for other endpoints
  return response.data;
};
