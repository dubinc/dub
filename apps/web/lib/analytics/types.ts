import { intervals } from "./constants";

export type IntervalProps = (typeof intervals)[number];
export type LocationTabs = "country" | "city";
export type TopLinksTabs = "link" | "url";
export type DeviceTabs = "device" | "browser" | "os" | "ua";
