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
  "/analytics/timeseries": {
    get: getTimeseriesAnalytics,
  },
  "/analytics/country": {
    get: getCountryAnalytics,
  },
  "/analytics/city": {
    get: getCityAnalytics,
  },
  "/analytics/device": {
    get: getDeviceAnalytics,
  },
  "/analytics/browser": {
    get: getBrowserAnalytics,
  },
  "/analytics/os": {
    get: getOSAnalytics,
  },
  "/analytics/referer": {
    get: getRefererAnalytics,
  },
  "/analytics/top_links": {
    get: getTopLinks,
  },
  "/analytics/top_urls": {
    get: getTopURLs,
  },
};
