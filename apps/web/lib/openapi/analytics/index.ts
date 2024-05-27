import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickAnalyticsResponse } from "@/lib/zod/schemas/clicks-analytics";
import { leadAnalyticsResponse } from "@/lib/zod/schemas/leads-analytics";
import { saleAnalyticsResponse } from "@/lib/zod/schemas/sales-analytics";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

const retrieveAnalytics: ZodOpenApiOperationObject = {
  operationId: "retrieveAnalytics",
  "x-speakeasy-name-override": "retrieve",
  summary:
    "Retrieve analytics for a link, a domain, or the authenticated workspace.",
  description:
    "Retrieve analytics for a link, a domain, or the authenticated workspace. The response type depends on the `event` and `type` query parameters.",
  requestParams: {
    query: workspaceParamsSchema.merge(analyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "Analytics data",
      content: {
        "application/json": {
          schema: z.union([
            clickAnalyticsResponse.count,
            z.array(clickAnalyticsResponse.timeseries),
            z.array(clickAnalyticsResponse.countries),
            z.array(clickAnalyticsResponse.cities),
            z.array(clickAnalyticsResponse.devices),
            z.array(clickAnalyticsResponse.browsers),
            z.array(clickAnalyticsResponse.os),
            z.array(clickAnalyticsResponse.referers),
            z.array(clickAnalyticsResponse.top_links),
            z.array(clickAnalyticsResponse.top_urls),

            leadAnalyticsResponse.count,
            z.array(leadAnalyticsResponse.timeseries),
            z.array(leadAnalyticsResponse.countries),
            z.array(leadAnalyticsResponse.cities),
            z.array(leadAnalyticsResponse.devices),
            z.array(leadAnalyticsResponse.browsers),
            z.array(leadAnalyticsResponse.os),
            z.array(leadAnalyticsResponse.referers),
            z.array(leadAnalyticsResponse.top_links),
            z.array(leadAnalyticsResponse.top_urls),

            saleAnalyticsResponse.count,
            z.array(saleAnalyticsResponse.timeseries),
            z.array(saleAnalyticsResponse.countries),
            z.array(saleAnalyticsResponse.cities),
            z.array(saleAnalyticsResponse.devices),
            z.array(saleAnalyticsResponse.browsers),
            z.array(saleAnalyticsResponse.os),
            z.array(saleAnalyticsResponse.referers),
            z.array(saleAnalyticsResponse.top_links),
            z.array(saleAnalyticsResponse.top_urls),
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
