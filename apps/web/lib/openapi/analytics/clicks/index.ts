import { ZodOpenApiPathsObject } from "zod-openapi";
import { getBrowserByClicks } from "./browser";
import { getCityByClicks } from "./city";
import { getClicksCount } from "./clicks";
import { getCountryByClicks } from "./country";
import { getDeviceByClicks } from "./device";
import { getOSByClicks } from "./os";
import { getRefererByClicks } from "./referer";
import { getTimeseriesByClicks } from "./timeseries";
import { getTopLinksByClicks } from "./top-links";
import { getTopURLsByClicks } from "./top-urls";

export const clickAnalyticsPaths: ZodOpenApiPathsObject = {
  "/analytics/clicks": {
    get: getClicksCount,
  },
  "/analytics/clicks/timeseries": {
    get: getTimeseriesByClicks,
  },
  "/analytics/clicks/country": {
    get: getCountryByClicks,
  },
  "/analytics/clicks/city": {
    get: getCityByClicks,
  },
  "/analytics/clicks/device": {
    get: getDeviceByClicks,
  },
  "/analytics/clicks/browser": {
    get: getBrowserByClicks,
  },
  "/analytics/clicks/os": {
    get: getOSByClicks,
  },
  "/analytics/clicks/referer": {
    get: getRefererByClicks,
  },
  "/analytics/clicks/top_links": {
    get: getTopLinksByClicks,
  },
  "/analytics/clicks/top_urls": {
    get: getTopURLsByClicks,
  },
};
