import { ZodOpenApiPathsObject } from "zod-openapi";
import { getBrowserAnalytics } from "./browser";
import { getCityAnalytics } from "./city";
import { getClicksAnalytics } from "./clicks";
import { getCountryAnalytics } from "./country";
import { getDeviceAnalytics } from "./device";
import { getOSAnalytics } from "./os";
import { getRefererAnalytics } from "./referer";
import { getTimeseriesAnalytics } from "./timeseries";
import { getTopLinks } from "./top-links";
import { getTopURLs } from "./top-urls";

export const analyticsPaths: ZodOpenApiPathsObject = {
  "/analytics/clicks": {
    get: getClicksAnalytics,
  },
  "/analytics/clicks/timeseries": {
    get: getTimeseriesAnalytics,
  },
  "/analytics/clicks/country": {
    get: getCountryAnalytics,
  },
  "/analytics/clicks/city": {
    get: getCityAnalytics,
  },
  "/analytics/clicks/device": {
    get: getDeviceAnalytics,
  },
  "/analytics/clicks/browser": {
    get: getBrowserAnalytics,
  },
  "/analytics/clicks/os": {
    get: getOSAnalytics,
  },
  "/analytics/clicks/referer": {
    get: getRefererAnalytics,
  },
  "/analytics/clicks/top_links": {
    get: getTopLinks,
  },
  "/analytics/clicks/top_urls": {
    get: getTopURLs,
  },
};
