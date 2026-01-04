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
            analyticsResponse.count,
            z.array(analyticsResponse.timeseries),
            z.array(analyticsResponse.continents),
            z.array(analyticsResponse.countries),
            z.array(analyticsResponse.regions),
            z.array(analyticsResponse.cities),
            z.array(analyticsResponse.devices),
            z.array(analyticsResponse.browsers),
            z.array(analyticsResponse.os),
            z.array(analyticsResponse.triggers),
            z.array(analyticsResponse.referers),
            z.array(analyticsResponse.referer_urls),
            z.array(analyticsResponse.top_links),
            z.array(analyticsResponse.top_urls),
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
