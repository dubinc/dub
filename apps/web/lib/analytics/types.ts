import z from "../zod";
import {
  analyticsQuerySchema,
  eventsQuerySchema,
} from "../zod/schemas/analytics";
import { EVENT_TYPES, VALID_ANALYTICS_ENDPOINTS, intervals } from "./constants";

export type IntervalOptions = (typeof intervals)[number];
export type AnalyticsGroupByOptions =
  (typeof VALID_ANALYTICS_ENDPOINTS)[number];
export type CompositeAnalyticsResponseOptions =
  | "clicks"
  | "leads"
  | "sales"
  | "amount";

export type EventType = (typeof EVENT_TYPES)[number];

export type LocationTabs = "countries" | "cities";
export type TopLinksTabs = "link" | "url";
export type DeviceTabs = "devices" | "browsers" | "os";

export type AnalyticsFilters = z.infer<typeof analyticsQuerySchema> & {
  workspaceId?: string;
  isDemo?: boolean;
  isDeprecatedClicksEndpoint?: boolean;
};

export type EventsFilters = z.infer<typeof eventsQuerySchema> & {
  workspaceId?: string;
  isDemo?: boolean;
};
