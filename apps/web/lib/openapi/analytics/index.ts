import { openApiErrorResponses } from "@/lib/openapi/responses";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import * as z from "zod/v4";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

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
            analyticsResponse.count,
            z
              .array(analyticsResponse.timeseries)
              .meta({ title: "AnalyticsTimeseries" }),
            z
              .array(analyticsResponse.continents)
              .meta({ title: "AnalyticsContinents" }),
            z
              .array(analyticsResponse.countries)
              .meta({ title: "AnalyticsCountries" }),
            z
              .array(analyticsResponse.regions)
              .meta({ title: "AnalyticsRegions" }),
            z
              .array(analyticsResponse.cities)
              .meta({ title: "AnalyticsCities" }),
            z
              .array(analyticsResponse.devices)
              .meta({ title: "AnalyticsDevices" }),
            z
              .array(analyticsResponse.browsers)
              .meta({ title: "AnalyticsBrowsers" }),
            z.array(analyticsResponse.os).meta({ title: "AnalyticsOS" }),
            z
              .array(analyticsResponse.triggers)
              .meta({ title: "AnalyticsTriggers" }),
            z
              .array(analyticsResponse.referers)
              .meta({ title: "AnalyticsReferers" }),
            z
              .array(analyticsResponse.referer_urls)
              .meta({ title: "AnalyticsRefererUrls" }),
            z
              .array(analyticsResponse.top_links)
              .meta({ title: "AnalyticsTopLinks" }),
            z
              .array(analyticsResponse.top_urls)
              .meta({ title: "AnalyticsTopUrls" }),
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
