import { ZodOpenApiPathsObject } from "zod-openapi";
import { getBrowsersByClicks } from "./browsers";
import { getCitiesByClicks } from "./cities";
import { getClicksCount } from "./count";
import { getCountriesByClicks } from "./countries";
import { getDevicesByClicks } from "./devices";
import { getOSByClicks } from "./os";
import { getReferersByClicks } from "./referers";
import { getTimeseriesByClicks } from "./timeseries";
import { getTopLinksByClicks } from "./top-links";
import { getTopURLsByClicks } from "./top-urls";

export const clickAnalyticsPaths: ZodOpenApiPathsObject = {
  "/analytics/clicks/count": {
    get: getClicksCount,
  },
  "/analytics/clicks/timeseries": {
    get: getTimeseriesByClicks,
  },
  "/analytics/clicks/countries": {
    get: getCountriesByClicks,
  },
  "/analytics/clicks/cities": {
    get: getCitiesByClicks,
  },
  "/analytics/clicks/devices": {
    get: getDevicesByClicks,
  },
  "/analytics/clicks/browsers": {
    get: getBrowsersByClicks,
  },
  "/analytics/clicks/os": {
    get: getOSByClicks,
  },
  "/analytics/clicks/referers": {
    get: getReferersByClicks,
  },
  "/analytics/clicks/top_links": {
    get: getTopLinksByClicks,
  },
  "/analytics/clicks/top_urls": {
    get: getTopURLsByClicks,
  },
};
