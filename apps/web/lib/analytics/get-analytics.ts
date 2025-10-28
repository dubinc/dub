import { combineTagIds } from "@/lib/api/tags/combine-tag-ids";
import { tb } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
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
import { queryParser } from "./query-parser";
import { AnalyticsFilters } from "./types";
import { getStartEndDates } from "./utils/get-start-end-dates";

// Fetch data for /api/analytics
export const getAnalytics = async (params: AnalyticsFilters) => {
  let {
    event,
    groupBy,
    workspaceId,
    linkId,
    linkIds,
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
    query,
  } = params;

  const tagIds = combineTagIds(params);

  // get all-time clicks count if:
  // 1. linkId or linkIds is defined
  // 2. type is count
  // 3. interval is all
  // 4. no custom start or end date is provided
  // 5. no other dimensional filters are applied
  if (
    (linkId || linkIds) &&
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

    // Handle single linkId
    if (linkId) {
      const response = await conn.execute(
        `SELECT ${columns} FROM Link WHERE id = ?`,
        [linkId],
      );

      return analyticsResponse["count"].parse(response.rows[0]);
    }

    // Handle multiple linkIds with aggregation
    if (linkIds && linkIds.length > 0) {
      const linkIdsToFilter = linkIds.map(() => "?").join(",");
      const aggregateColumns =
        event === "composite"
          ? `SUM(clicks) as clicks, SUM(leads) as leads, SUM(sales) as sales, SUM(saleAmount) as saleAmount`
          : event === "sales"
            ? `SUM(sales) as sales, SUM(saleAmount) as saleAmount`
            : `SUM(${event}) as ${event}`;

      const response = await conn.execute(
        `SELECT ${aggregateColumns} FROM Link WHERE id IN (${linkIdsToFilter})`,
        linkIds,
      );

      return analyticsResponse["count"].parse(response.rows[0]);
    }
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

  if (qr) {
    trigger = "qr";
  }

  if (region) {
    const split = region.split("-");
    country = split[0];
    region = split[1];
  }

  // Create a Tinybird pipe
  const pipe = tb.buildPipe({
    pipe: ["count", "timeseries"].includes(groupBy)
      ? `v3_${groupBy}`
      : ["top_partners"].includes(groupBy)
        ? "v3_group_by_link_metadata"
        : "v3_group_by",
    parameters: analyticsFilterTB,
    data: z.object({
      groupByField: z.string(),
      clicks: z.number().default(0),
      leads: z.number().default(0),
      sales: z.number().default(0),
      saleAmount: z.number().default(0),
      // only for cities and regions groupBy
      country: z.string().optional(),
      region: z.string().optional(),
    }),
  });

  const filters = queryParser(query);

  const response = await pipe({
    ...params,
    groupBy,
    eventType: event,
    workspaceId,
    tagIds,
    trigger,
    start: startDate.toISOString().replace("T", " ").replace("Z", ""),
    end: endDate.toISOString().replace("T", " ").replace("Z", ""),
    granularity,
    timezone,
    country,
    region,
    filters: filters ? JSON.stringify(filters) : undefined,
  });

  if (groupBy === "count") {
    const { groupByField, ...rest } = response.data[0];
    // Return the count value for deprecated count endpoints
    if (isDeprecatedClicksEndpoint) {
      return rest[event];
      // Return the object for regular count endpoints
    } else {
      return rest;
    }
  } else if (groupBy === "top_links") {
    const links = await prisma.link.findMany({
      where: {
        id: {
          in: response.data.map((item) => item.groupByField),
        },
      },
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
        comments: true,
        title: true,
        createdAt: true,
      },
    });

    return response.data
      .map((item) => {
        const link = links.find((l) => l.id === item.groupByField);
        if (!link) {
          return null;
        }

        link.key = decodeKeyIfCaseSensitive({
          domain: link.domain,
          key: link.key,
        });

        return analyticsResponse[groupBy].parse({
          id: link.id,
          link: link.id,
          domain: link.domain,
          key: punyEncode(link.key),
          url: link.url,
          shortLink: linkConstructor({
            domain: link.domain,
            key: punyEncode(link.key),
          }),
          comments: link.comments,
          title: link.title || null,
          createdAt: link.createdAt.toISOString(),
          ...item,
        });
      })
      .filter((d) => d !== null);
  } else if (groupBy === "top_partners") {
    const partners = await prisma.partner.findMany({
      where: {
        id: {
          in: response.data.map((item) => item.groupByField),
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        country: true,
        payoutsEnabledAt: true,
      },
    });

    return response.data
      .map((item) => {
        const partner = partners.find((p) => p.id === item.groupByField);
        if (!partner) return null;
        return analyticsResponse[groupBy].parse({
          ...item,
          partnerId: item.groupByField,
          partner: {
            ...partner,
            payoutsEnabledAt: partner.payoutsEnabledAt?.toISOString() || null,
          },
        });
      })
      .filter((d) => d !== null);
  }

  // Return array for other endpoints
  const schema = analyticsResponse[groupBy];

  return response.data.map((item) =>
    schema.parse({
      ...item,
      [SINGULAR_ANALYTICS_ENDPOINTS[groupBy]]: item.groupByField,
    }),
  );
};
