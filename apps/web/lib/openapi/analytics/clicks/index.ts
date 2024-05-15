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
  /**
   * DEPRECATED ENDPOINTS
   */
  "/analytics/clicks": {
    get: {
      ...getClicksCount,
      "x-speakeasy-name-override": "clicks",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/timeseries": {
    get: {
      ...getTimeseriesByClicks,
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/country": {
    get: {
      ...getCountriesByClicks,
      "x-speakeasy-name-override": "country",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/city": {
    get: {
      ...getCitiesByClicks,
      "x-speakeasy-name-override": "city",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/device": {
    get: {
      ...getDevicesByClicks,
      "x-speakeasy-name-override": "device",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/browser": {
    get: {
      ...getBrowsersByClicks,
      "x-speakeasy-name-override": "browser",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/os": {
    get: { ...getOSByClicks, tags: ["analytics"], deprecated: true },
  },
  "/analytics/referer": {
    get: {
      ...getReferersByClicks,
      "x-speakeasy-name-override": "referer",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/top_links": {
    get: { ...getTopLinksByClicks, tags: ["analytics"], deprecated: true },
  },
  "/analytics/top_urls": {
    get: {
      ...getTopURLsByClicks,
      tags: ["analytics"],
      deprecated: true,
    },
  },
};
