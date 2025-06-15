import z from "../zod";
import {
  analyticsQuerySchema,
  eventsQuerySchema,
} from "../zod/schemas/analytics";
import { analyticsResponse } from "../zod/schemas/analytics-response";
import { getPartnerEarningsTimeseriesSchema } from "../zod/schemas/partner-profile";
import {
  ANALYTICS_SALE_UNIT,
  ANALYTICS_VIEWS,
  DATE_RANGE_INTERVAL_PRESETS,
  EVENT_TYPES,
  VALID_ANALYTICS_ENDPOINTS,
} from "./constants";

export type IntervalOptions = (typeof DATE_RANGE_INTERVAL_PRESETS)[number];

export type AnalyticsGroupByOptions =
  (typeof VALID_ANALYTICS_ENDPOINTS)[number];

export type AnalyticsResponseOptions =
  | "clicks"
  | "leads"
  | "sales"
  | "saleAmount";

export type AnalyticsResponse = {
  [K in keyof typeof analyticsResponse]: z.infer<(typeof analyticsResponse)[K]>;
};

export type EventType = (typeof EVENT_TYPES)[number];

export type AnalyticsView = (typeof ANALYTICS_VIEWS)[number];
export type AnalyticsSaleUnit = (typeof ANALYTICS_SALE_UNIT)[number];

export type DeviceTabs = "devices" | "browsers" | "os" | "triggers";

export type AnalyticsFilters = z.infer<typeof analyticsQuerySchema> & {
  workspaceId?: string;
  dataAvailableFrom?: Date;
  isDemo?: boolean;
  isDeprecatedClicksEndpoint?: boolean;
  folderIds?: string[];
  isMegaFolder?: boolean;
};

export type EventsFilters = z.infer<typeof eventsQuerySchema> & {
  workspaceId?: string;
  dataAvailableFrom?: Date;
  isDemo?: boolean;
  customerId?: string;
  folderIds?: string[];
  isMegaFolder?: boolean;
};

const partnerAnalyticsSchema = analyticsQuerySchema
  .pick({
    event: true,
    interval: true,
    start: true,
    end: true,
    groupBy: true,
    linkId: true,
  })
  .partial();

export type PartnerAnalyticsFilters = z.infer<typeof partnerAnalyticsSchema>;
export type PartnerEarningsTimeseriesFilters = z.infer<
  typeof getPartnerEarningsTimeseriesSchema
>;

const partnerEventsSchema = eventsQuerySchema
  .pick({
    event: true,
    interval: true,
    start: true,
    end: true,
    groupBy: true,
    page: true,
    limit: true,
    order: true,
    sortOrder: true,
    sortBy: true,
  })
  .partial();

export type PartnerEventsFilters = z.infer<typeof partnerEventsSchema>;
