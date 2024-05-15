import { intervals } from "./constants";

export type IntervalProps = (typeof intervals)[number];
export type AnalyticsEndpoints =
  | "count"
  | "timeseries"
  | "countries"
  | "cities"
  | "devices"
  | "browsers"
  | "os"
  | "referers"
  | "top_links"
  | "top_urls";
export type LocationTabs = "countries" | "cities";
export type TopLinksTabs = "link" | "url";
export type DeviceTabs = "devices" | "browsers" | "os";
