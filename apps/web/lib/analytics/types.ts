import { intervals } from "./constants";

export type IntervalProps = (typeof intervals)[number];
export type AnalyticsEndpoints =
  | "count"
  | "timeseries"
  | "country"
  | "city"
  | "device"
  | "browser"
  | "os"
  | "referer"
  | "top_links"
  | "top_urls";
export type LocationTabs = "country" | "city";
export type TopLinksTabs = "link" | "url";
export type DeviceTabs = "device" | "browser" | "os";
