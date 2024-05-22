import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  clickAnalyticsQuerySchema,
  getClickAnalyticsResponse,
} from "@/lib/zod/schemas/clicks-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getTopURLsByClicks: ZodOpenApiOperationObject = {
  operationId: "getTopURLsByClicks",
  "x-speakeasy-name-override": "topUrls",
  summary: "Retrieve top URLs by clicks",
  description:
    "Retrieve the top URLs by number of clicks for a given short link.",
  requestParams: {
    query: workspaceParamsSchema.merge(clickAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top URLs by number of clicks",
      content: {
        "application/json": {
          schema: z.array(getClickAnalyticsResponse["top_urls"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
