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
            clickAnalyticsResponse.timeseries,
            clickAnalyticsResponse.countries,
            clickAnalyticsResponse.cities,
            clickAnalyticsResponse.devices,
            clickAnalyticsResponse.browsers,
            clickAnalyticsResponse.os,
            clickAnalyticsResponse.referers,
            clickAnalyticsResponse.top_links,
            clickAnalyticsResponse.top_urls,
            leadAnalyticsResponse.count,
            leadAnalyticsResponse.timeseries,
            leadAnalyticsResponse.countries,
            leadAnalyticsResponse.cities,
            leadAnalyticsResponse.devices,
            leadAnalyticsResponse.browsers,
            leadAnalyticsResponse.os,
            leadAnalyticsResponse.referers,
            leadAnalyticsResponse.top_links,
            leadAnalyticsResponse.top_urls,
            saleAnalyticsResponse.count,
            saleAnalyticsResponse.timeseries,
            saleAnalyticsResponse.countries,
            saleAnalyticsResponse.cities,
            saleAnalyticsResponse.devices,
            saleAnalyticsResponse.browsers,
            saleAnalyticsResponse.os,
            saleAnalyticsResponse.referers,
            saleAnalyticsResponse.top_links,
            saleAnalyticsResponse.top_urls,
          ]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics"],
  security: [{ token: [] }],
};

export const analyticsPath: ZodOpenApiPathsObject = {
  "/analytics": {
    get: retrieveAnalytics,
  },
};
