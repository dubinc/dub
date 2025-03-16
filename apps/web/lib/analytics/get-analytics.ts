import { combineTagIds } from "@/lib/api/tags/combine-tag-ids";
import { tb } from "@/lib/tinybird";
import { UTM_TAGS_PLURAL_LIST } from "@/lib/zod/schemas/utm";
import { prismaEdge } from "@dub/prisma/edge";
import { linkConstructor, punyEncode } from "@dub/utils";
import { decodeKeyIfCaseSensitive } from "../api/links/case-sensitivity";
import { conn } from "../planetscale";
import z from "../zod";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { analyticsResponse } from "../zod/schemas/analytics-response";
import {
  DIMENSIONAL_ANALYTICS_FILTERS,
  SINGULAR_ANALYTICS_ENDPOINTS,
} from "./constants";
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
    region,
    country,
    timezone = "UTC",
    isDeprecatedClicksEndpoint = false,
    dataAvailableFrom,
  } = params;

  const tagIds = combineTagIds(params);

  // get all-time clicks count if:
  // 1. linkId is defined
  // 2. type is count
  // 3. interval is all
  // 4. no custom start or end date is provided
  // 5. no other dimensional filters are applied
  if (
    linkId &&
    groupBy === "count" &&
    interval === "all" &&
    !start &&
    !end &&
    DIMENSIONAL_ANALYTICS_FILTERS.every(
      (filter) => !params[filter as keyof AnalyticsFilters],
    )
  ) {
    const columns =
      event === "composite"
        ? `clicks, leads, sales, saleAmount`
        : event === "sales"
          ? `sales, saleAmount`
          : `${event}`;

    const response = await conn.execute(
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
    dataAvailableFrom,
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
  const pipe = tb.buildPipe({
    pipe: `v2_${UTM_TAGS_PLURAL_LIST.includes(groupBy) ? "utms" : groupBy}`,
    parameters: analyticsFilterTB,
    data:
      groupBy === "top_links" || UTM_TAGS_PLURAL_LIST.includes(groupBy)
        ? z.any()
        : analyticsResponse[groupBy],
  });

  const response = await pipe({
    ...params,
    ...(UTM_TAGS_PLURAL_LIST.includes(groupBy)
      ? { groupByUtmTag: SINGULAR_ANALYTICS_ENDPOINTS[groupBy] }
      : {}),
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
        comments: true,
        createdAt: true,
      },
    });

    return topLinksData
      .map((topLink) => {
        const link = links.find((l) => l.id === topLink.link);
        if (!link) {
          return null;
        }

        link.key = decodeKeyIfCaseSensitive({
          domain: link.domain,
          key: link.key,
        });

        return analyticsResponse[groupBy].parse({
          id: link.id,
          domain: link.domain,
          key: punyEncode(link.key),
          url: link.url,
          shortLink: linkConstructor({
            domain: link.domain,
            key: punyEncode(link.key),
          }),
          comments: link.comments,
          createdAt: link.createdAt.toISOString(),
          ...topLink,
        });
      })
      .filter((d) => d !== null);

    // special case for utm tags
  } else if (UTM_TAGS_PLURAL_LIST.includes(groupBy)) {
    const schema = analyticsResponse[groupBy];

    return response.data.map((item) =>
      schema.parse({
        ...item,
        [SINGULAR_ANALYTICS_ENDPOINTS[groupBy]]: item.utm,
      }),
    );
  }

  // Return array for other endpoints
  return response.data;
};
