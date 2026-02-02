import { combineTagIds } from "@/lib/api/tags/combine-tag-ids";
import { tb } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { FolderAccessLevel } from "@dub/prisma/client";
import { linkConstructor, punyEncode } from "@dub/utils";
import * as z from "zod/v4";
import { decodeKeyIfCaseSensitive } from "../api/links/case-sensitivity";
import { conn } from "../planetscale";
import { analyticsFilterTB } from "../zod/schemas/analytics";
import { analyticsResponse } from "../zod/schemas/analytics-response";
import { buildAdvancedFilters } from "./build-advanced-filters";
import {
  DIMENSIONAL_ANALYTICS_FILTERS,
  SINGULAR_ANALYTICS_ENDPOINTS,
} from "./constants";
import { queryParser } from "./query-parser";
import { AnalyticsFilters } from "./types";
import { formatUTCDateTimeClickhouse } from "./utils/format-utc-datetime-clickhouse";
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
    timezone,
  });

  // Handle qr backward compatibility
  let triggerForPipe = trigger;
  if (qr && !trigger) {
    triggerForPipe = { operator: "IS" as const, sqlOperator: "=" as const, values: ["qr"] };
  }

  // Handle region split (format: "US-CA")
  let countryForPipe = country;
  let regionForPipe = region;
  if (region && typeof region === 'string') {
    const split = region.split("-");
    countryForPipe = { operator: "IS" as const, sqlOperator: "=" as const, values: [split[0]] };
    regionForPipe = split[1];
  }

  // Create a Tinybird pipe
  const pipe = tb.buildPipe({
    pipe: ["count", "timeseries"].includes(groupBy)
      ? `v3_${groupBy}`
      : [
        "top_folders",
        "top_link_tags",
        "top_domains",
        "top_partners",
        "top_groups",
      ].includes(groupBy)
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

  const metadataFilters = queryParser(query) || [];

  const advancedFilters = buildAdvancedFilters({
    country: countryForPipe,
    city: params.city,
    continent: params.continent,
    device: params.device,
    browser: params.browser,
    os: params.os,
    referer: params.referer,
    refererUrl: params.refererUrl,
    url: params.url,
    trigger: triggerForPipe,
  });

  const allFilters = [...metadataFilters, ...advancedFilters];
  const fieldsInAdvancedFilters = new Set(advancedFilters.map(f => f.field));

  const tinybirdParams: any = {
    workspaceId: params.workspaceId,
    linkId: params.linkId,
    linkIds: params.linkIds,
    folderIds: params.folderIds,
    domain: params.domain,
    tagIds: params.tagIds,
    customerId: params.customerId,
    programId: params.programId,
    partnerId: params.partnerId,
    tenantId: params.tenantId,
    folderId: params.folderId,
    groupId: params.groupId,
    root: params.root,
    saleType: params.saleType,

    country: !fieldsInAdvancedFilters.has('country') && countryForPipe?.sqlOperator === '=' ? countryForPipe.values[0] : undefined,
    city: !fieldsInAdvancedFilters.has('city') && params.city?.sqlOperator === '=' ? params.city.values[0] : undefined,
    continent: !fieldsInAdvancedFilters.has('continent') && params.continent?.sqlOperator === '=' ? params.continent.values[0] : undefined,
    device: !fieldsInAdvancedFilters.has('device') && params.device?.sqlOperator === '=' ? params.device.values[0] : undefined,
    browser: !fieldsInAdvancedFilters.has('browser') && params.browser?.sqlOperator === '=' ? params.browser.values[0] : undefined,
    os: !fieldsInAdvancedFilters.has('os') && params.os?.sqlOperator === '=' ? params.os.values[0] : undefined,
    trigger: !fieldsInAdvancedFilters.has('trigger') && triggerForPipe?.sqlOperator === '=' ? triggerForPipe.values[0] : undefined,
    referer: !fieldsInAdvancedFilters.has('referer') && params.referer?.sqlOperator === '=' ? params.referer.values[0] : undefined,
    refererUrl: !fieldsInAdvancedFilters.has('refererUrl') && params.refererUrl?.sqlOperator === '=' ? params.refererUrl.values[0] : undefined,
    url: !fieldsInAdvancedFilters.has('url') && params.url?.sqlOperator === '=' ? params.url.values[0] : undefined,

    utm_source: params.utm_source,
    utm_medium: params.utm_medium,
    utm_campaign: params.utm_campaign,
    utm_term: params.utm_term,
    utm_content: params.utm_content,
    groupBy,
    eventType: event,
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
    granularity,
    timezone,
    region: typeof regionForPipe === 'string' ? regionForPipe : undefined,

    filters: allFilters.length > 0 ? JSON.stringify(allFilters) : undefined,
  };

  const response = await pipe(tinybirdParams);

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
  } else if (groupBy === "top_link_tags") {
    const tags = await prisma.tag.findMany({
      where: {
        id: {
          in: response.data.map((item) => item.groupByField),
        },
      },
    });

    return response.data
      .map((item) => {
        const tag = tags.find((t) => t.id === item.groupByField);
        if (!tag) return null;
        return analyticsResponse[groupBy].parse({
          ...item,
          tagId: item.groupByField,
          tag,
        });
      })
      .filter((d) => d !== null);
  } else if (groupBy === "top_folders") {
    const folders = await prisma.folder.findMany({
      where: {
        id: {
          in: response.data.map((item) => item.groupByField),
        },
      },
      select: {
        id: true,
        name: true,
        accessLevel: true,
      },
    });

    return response.data
      .map((item) => {
        const folder = folders.find((f) => f.id === item.groupByField);
        if (!folder) return null;
        return analyticsResponse.top_folders
          .extend({
            folder: analyticsResponse.top_folders.shape.folder.extend({
              accessLevel: z.enum(FolderAccessLevel).nullish(),
            }),
          })
          .parse({
            ...item,
            folderId: item.groupByField,
            folder,
          });
      })
      .filter((d) => d !== null);
  } else if (groupBy === "top_groups") {
    const groups = await prisma.partnerGroup.findMany({
      where: {
        id: {
          in: response.data.map((item) => item.groupByField),
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
      },
    });

    return response.data
      .map((item) => {
        const group = groups.find((g) => g.id === item.groupByField);

        if (!group) return null;

        return analyticsResponse[groupBy].parse({
          ...item,
          groupId: item.groupByField,
          group,
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
