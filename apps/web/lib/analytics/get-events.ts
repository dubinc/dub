import { tb } from "@/lib/tinybird";
import { LinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { OG_AVATAR_URL } from "@dub/utils";
import * as z from "zod/v4";
import { decodeLinkIfCaseSensitive } from "../api/links/case-sensitivity";
import { transformLink } from "../api/links/utils/transform-link";
import { generateRandomName } from "../names";
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
import {
  buildAdvancedFilters,
  ensureParsedFilter,
  extractWorkspaceLinkFilters,
  prepareFiltersForPipe,
} from "./filter-helpers";
import { metadataQueryParser } from "./metadata-query-parser";
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

  const { triggerForPipe, countryForPipe, regionForPipe } =
    prepareFiltersForPipe({
      qr,
      trigger,
      region,
      country,
    });

  // support legacy order param
  if (order && order !== "desc") {
    sortOrder = order;
  }

  const pipe = tb.buildPipe({
    pipe: "v4_events",
    parameters: eventsFilterTB,
    data:
      {
        clicks: clickEventSchemaTBEndpoint,
        leads: leadEventSchemaTBEndpoint,
        sales: saleEventSchemaTBEndpoint,
      }[eventType] ?? clickEventSchemaTBEndpoint,
  });

  const metadataFilters = metadataQueryParser(query) || [];

  // Build advanced filters for event-level dimensions
  const advancedFilters = buildAdvancedFilters({
    ...params,
    country: countryForPipe,
    trigger: triggerForPipe,
  });

  const allFilters = [...metadataFilters, ...advancedFilters];

  const partnerIdFilter = ensureParsedFilter(params.partnerId);
  const partnerTagIdFilter = ensureParsedFilter(params.partnerTagId);
  const linkIdFilter = ensureParsedFilter(params.linkId);
  const folderIdFilter = ensureParsedFilter(params.folderId);

  const {
    linkId: linkIdParam,
    linkIdOperator,
    domain: domainParam,
    domainOperator,
    tagId: tagIdParam,
    tagIdOperator,
    folderId: folderIdParam,
    folderIdOperator,
    partnerId: partnerIdParam,
    partnerIdOperator,
    partnerTagId: partnerTagIdParam,
    partnerTagIdOperator,
    groupId: groupIdParam,
    groupIdOperator,
    tenantId: tenantIdParam,
    tenantIdOperator,
  } = extractWorkspaceLinkFilters({
    ...params,
    partnerId: partnerIdFilter,
    partnerTagId: partnerTagIdFilter,
    linkId: linkIdFilter,
    folderId: folderIdFilter,
  });

  const tinybirdParams: any = {
    eventType,
    workspaceId,
    programId: params.programId,
    customerId: params.customerId,
    linkId: linkIdParam,
    linkIdOperator,
    folderId: folderIdParam,
    folderIdOperator,
    partnerId: partnerIdParam,
    partnerIdOperator,
    partnerTagId: partnerTagIdParam,
    partnerTagIdOperator,
    tenantId: tenantIdParam,
    tenantIdOperator,
    groupId: groupIdParam,
    groupIdOperator,
    ...(typeof triggerForPipe !== "object" && triggerForPipe
      ? { trigger: triggerForPipe }
      : {}),
    ...(typeof countryForPipe !== "object" && countryForPipe
      ? { country: countryForPipe }
      : {}),
    ...(typeof regionForPipe === "string" ? { region: regionForPipe } : {}),
    // Workspace links filters with operators
    ...(domainParam ? { domain: domainParam, domainOperator } : {}),
    ...(tagIdParam ? { tagId: tagIdParam, tagIdOperator } : {}),
    ...(folderIdParam ? { folderId: folderIdParam, folderIdOperator } : {}),
    ...(params.root !== undefined ? { root: params.root } : {}),
    ...(params.saleType ? { saleType: params.saleType } : {}),
    order: sortOrder,
    offset: (params.page - 1) * params.limit,
    limit: params.limit,
    sortBy: params.sortBy,
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
    filters: allFilters.length > 0 ? JSON.stringify(allFilters) : undefined,
  };

  const response = await pipe(tinybirdParams);

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

      const transformedLink = transformLink(link, { skipDecodeKey: true });
      if (
        transformedLink.testVariants &&
        !Array.isArray(transformedLink.testVariants)
      ) {
        transformedLink.testVariants = null;
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
        link: transformedLink,
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
    {} as Record<string, LinkProps>,
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
