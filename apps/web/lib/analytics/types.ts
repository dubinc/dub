import z from "../zod";
import {
  analyticsQuerySchema,
  eventsQuerySchema,
} from "../zod/schemas/analytics";
import {
  ANALYTICS_VIEWS,
  EVENT_TYPES,
  VALID_ANALYTICS_ENDPOINTS,
  intervals,
} from "./constants";

export type IntervalOptions = (typeof intervals)[number];

export type AnalyticsGroupByOptions =
  (typeof VALID_ANALYTICS_ENDPOINTS)[number];

export type AnalyticsResponseOptions =
  | "clicks"
  | "leads"
  | "sales"
  | "saleAmount";

export type EventType = (typeof EVENT_TYPES)[number];

export type AnalyticsView = (typeof ANALYTICS_VIEWS)[number];

export type LocationTabs = "countries" | "cities";
export type TopLinksTabs = "link" | "url";
export type DeviceTabs = "devices" | "browsers" | "os" | "trigger";
export type RefererTabs = "referers" | "referer_urls";

export type AnalyticsFilters = z.infer<typeof analyticsQuerySchema> & {
  workspaceId?: string;
  isDemo?: boolean;
  isDeprecatedClicksEndpoint?: boolean;
};

export type EventsFilters = z.infer<typeof eventsQuerySchema> & {
  workspaceId?: string;
  isDemo?: boolean;
};
