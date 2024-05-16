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
      operationId: "getClicksCountDeprecated",
      "x-speakeasy-name-override": undefined,
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.count instead.",
      "x-speakeasy-deprecation-replacement": "getClicksCount",
      tags: ["analytics.clicks"],
      deprecated: true,
    },
  },
  "/analytics/timeseries": {
    get: {
      ...getTimeseriesByClicks,
      operationId: "getTimeseriesByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.timeseries instead.",
      "x-speakeasy-deprecation-replacement": "getTimeseriesByClicks",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/country": {
    get: {
      ...getCountriesByClicks,
      operationId: "getCountriesByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.countries instead.",
      "x-speakeasy-deprecation-replacement": "getCountriesByClicks",
      "x-speakeasy-name-override": "country",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/city": {
    get: {
      ...getCitiesByClicks,
      operationId: "getCitiesByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.cities instead.",
      "x-speakeasy-deprecation-replacement": "getCitiesByClicks",
      "x-speakeasy-name-override": "city",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/device": {
    get: {
      ...getDevicesByClicks,
      operationId: "getDevicesByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.devices instead.",
      "x-speakeasy-deprecation-replacement": "getDevicesByClicks",
      "x-speakeasy-name-override": "device",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/browser": {
    get: {
      ...getBrowsersByClicks,
      operationId: "getBrowsersByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.browsers instead.",
      "x-speakeasy-deprecation-replacement": "getBrowsersByClicks",
      "x-speakeasy-name-override": "browser",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/os": {
    get: {
      ...getOSByClicks,
      operationId: "getOSByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.os instead.",
      "x-speakeasy-deprecation-replacement": "getOSByClicks",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/referer": {
    get: {
      ...getReferersByClicks,
      operationId: "getReferersByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.referers instead.",
      "x-speakeasy-deprecation-replacement": "getReferersByClicks",
      "x-speakeasy-name-override": "referer",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/top_links": {
    get: {
      ...getTopLinksByClicks,
      operationId: "getTopLinksByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.topLinks instead.",
      "x-speakeasy-deprecation-replacement": "getTopLinksByClicks",
      tags: ["analytics"],
      deprecated: true,
    },
  },
  "/analytics/top_urls": {
    get: {
      ...getTopURLsByClicks,
      operationId: "getTopURLsByClicksDeprecated",
      "x-speakeasy-deprecation-message":
        "This method is deprecated. Use dub.analytics.clicks.topUrls instead.",
      "x-speakeasy-deprecation-replacement": "getTopURLsByClicks",
      tags: ["analytics"],
      deprecated: true,
    },
  },
};
