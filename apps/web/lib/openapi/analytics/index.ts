import { openApiErrorResponses } from "@/lib/openapi/responses";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";
import * as z from "zod/v4";

const retrieveAnalytics: ZodOpenApiOperationObject = {
  operationId: "retrieveAnalytics",
  "x-speakeasy-name-override": "retrieve",
  summary:
    "Retrieve analytics for a link, a domain, or the authenticated workspace.",
  description:
    "Retrieve analytics for a link, a domain, or the authenticated workspace. The response type depends on the `event` and `type` query parameters.",
  requestParams: {
    query: analyticsQuerySchema,
  },
  responses: {
    "200": {
      description: "Analytics data",
      content: {
        "application/json": {
          schema: z.union([
            analyticsResponse.count.meta({
              id: "AnalyticsCount",
            }),
            z.array(
              analyticsResponse.timeseries.meta({
                id: "AnalyticsTimeseries",
              }),
            ),
            z.array(
              analyticsResponse.continents.meta({
                id: "AnalyticsContinents",
              }),
            ),
            z.array(
              analyticsResponse.countries.meta({
                id: "AnalyticsCountries",
              }),
            ),
            z.array(
              analyticsResponse.regions.meta({
                id: "AnalyticsRegions",
              }),
            ),
            z.array(
              analyticsResponse.cities.meta({
                id: "AnalyticsCities",
              }),
            ),
            z.array(
              analyticsResponse.devices.meta({
                id: "AnalyticsDevices",
              }),
            ),
            z.array(
              analyticsResponse.browsers.meta({
                id: "AnalyticsBrowsers",
              }),
            ),
            z.array(
              analyticsResponse.os.meta({
                id: "AnalyticsOS",
              }),
            ),
            z.array(
              analyticsResponse.triggers.meta({
                id: "AnalyticsTriggers",
              }),
            ),
            z.array(
              analyticsResponse.referers.meta({
                id: "AnalyticsReferers",
              }),
            ),
            z.array(
              analyticsResponse.referer_urls.meta({
                id: "AnalyticsRefererUrls",
              }),
            ),
            z.array(
              analyticsResponse.top_links.meta({
                id: "AnalyticsTopLinks",
              }),
            ),
            z.array(
              analyticsResponse.top_urls.meta({
                id: "AnalyticsTopUrls",
              }),
            ),
          ]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};

export const analyticsPath: ZodOpenApiPathsObject = {
  "/analytics": {
    get: retrieveAnalytics,
  },
};
