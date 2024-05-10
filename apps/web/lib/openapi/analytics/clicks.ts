import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  clickAnalyticsQuerySchema,
  getClickAnalyticsResponse,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getClicksAnalytics: ZodOpenApiOperationObject = {
  operationId: "getClicksAnalytics",
  "x-speakeasy-name-override": "clicks",
  summary: "Retrieve clicks analytics",
  description:
    "Retrieve the number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(clickAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The number of clicks",
      content: {
        "application/json": {
          schema: z.union([
            z.number().describe("The total number of clicks"),
            z.array(getClickAnalyticsResponse["timeseries"]),
            z.array(getClickAnalyticsResponse["country"]),
            z.array(getClickAnalyticsResponse["city"]),
            z.array(getClickAnalyticsResponse["device"]),
            z.array(getClickAnalyticsResponse["browser"]),
            z.array(getClickAnalyticsResponse["os"]),
            z.array(getClickAnalyticsResponse["referer"]),
            z.array(getClickAnalyticsResponse["top_links"]),
            z.array(getClickAnalyticsResponse["top_urls"]),
          ]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
