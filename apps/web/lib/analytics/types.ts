import { ParsedFilter } from "@dub/utils";
import * as z from "zod/v4";
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

type Override<T, U> = Omit<T, keyof U> & U;

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

export type AnalyticsFilters = Partial<Omit<z.infer<typeof analyticsQuerySchema>, 'start' | 'end' | 'partnerId'>> & {
  workspaceId?: string;
  dataAvailableFrom?: Date;
  isDeprecatedClicksEndpoint?: boolean;
  linkIds?: string[];
  folderIds?: string[]; // TODO: remove this once it's been added to the public API
  start?: Date | null;
  end?: Date | null;
  // Accept plain string (from partner-profile routes) or ParsedFilter (from API schema)
  partnerId?: string | ParsedFilter;
};

// Structural fields from eventsQuerySchema that should remain required
type EventsStructuralFields = Pick<z.infer<typeof eventsQuerySchema>, 'event' | 'page' | 'limit' | 'sortBy'>;

export type EventsFilters = Partial<Omit<z.infer<typeof eventsQuerySchema>, 'start' | 'end' | 'partnerId' | keyof EventsStructuralFields>> &
  EventsStructuralFields & {
    workspaceId?: string;
    dataAvailableFrom?: Date;
    customerId?: string;
    folderIds?: string[];
    start?: Date | null;
    end?: Date | null;
    // Accept plain string (from partner-profile routes) or ParsedFilter (from API schema)
    partnerId?: string | ParsedFilter;
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
