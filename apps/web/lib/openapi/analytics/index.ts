import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
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
              .openapi({ title: "AnalyticsTimeseries" }),
            z
              .array(analyticsResponse.continents)
              .openapi({ title: "AnalyticsContinents" }),
            z
              .array(analyticsResponse.countries)
              .openapi({ title: "AnalyticsCountries" }),
            z
              .array(analyticsResponse.cities)
              .openapi({ title: "AnalyticsCities" }),
            z
              .array(analyticsResponse.devices)
              .openapi({ title: "AnalyticsDevices" }),
            z
              .array(analyticsResponse.browsers)
              .openapi({ title: "AnalyticsBrowsers" }),
            z.array(analyticsResponse.os).openapi({ title: "AnalyticsOS" }),
            z
              .array(analyticsResponse.triggers)
              .openapi({ title: "AnalyticsTriggers" }),
            z
              .array(analyticsResponse.referers)
              .openapi({ title: "AnalyticsReferers" }),
            z
              .array(analyticsResponse.referer_urls)
              .openapi({ title: "AnalyticsRefererUrls" }),
            z
              .array(analyticsResponse.top_links)
              .openapi({ title: "AnalyticsTopLinks" }),
            z
              .array(analyticsResponse.top_urls)
              .openapi({ title: "AnalyticsTopUrls" }),
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
