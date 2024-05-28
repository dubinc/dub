import z from "../zod";
import { analyticsQuerySchema } from "../zod/schemas/analytics";
import { EVENT_TYPES, VALID_ANALYTICS_ENDPOINTS, intervals } from "./constants";

export type IntervalProps = (typeof intervals)[number];
export type AnalyticsEvents = (typeof EVENT_TYPES)[number];
export type AnalyticsEndpoints = (typeof VALID_ANALYTICS_ENDPOINTS)[number];
export type LocationTabs = "countries" | "cities";
export type LocationTabsSingular = "country" | "city";
export type TopLinksTabs = "link" | "url";
export type DeviceTabs = "devices" | "browsers" | "os";

export type AnalyticsFilters = z.infer<typeof analyticsQuerySchema> & {
  workspaceId?: string;
  isDemo?: boolean;
  isDeprecatedEndpoint?: boolean;
};
