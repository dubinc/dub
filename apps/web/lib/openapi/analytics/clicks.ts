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
          schema: z.discriminatedUnion("groupBy", [
            z.object({
              groupBy: z.undefined(),
              response: z.number().describe("The total number of clicks"),
            }),
            z.object({
              groupBy: z.literal("timeseries"),
              response: z.array(getClickAnalyticsResponse["timeseries"]),
            }),
            z.object({
              groupBy: z.literal("country"),
              response: z.array(getClickAnalyticsResponse["country"]),
            }),
            z.object({
              groupBy: z.literal("city"),
              response: z.array(getClickAnalyticsResponse["city"]),
            }),
            z.object({
              groupBy: z.literal("device"),
              response: z.array(getClickAnalyticsResponse["device"]),
            }),
            z.object({
              groupBy: z.literal("browser"),
              response: z.array(getClickAnalyticsResponse["browser"]),
            }),
            z.object({
              groupBy: z.literal("os"),
              response: z.array(getClickAnalyticsResponse["os"]),
            }),
            z.object({
              groupBy: z.literal("referer"),
              response: z.array(getClickAnalyticsResponse["referer"]),
            }),
            z.object({
              groupBy: z.literal("top_links"),
              response: z.array(getClickAnalyticsResponse["top_links"]),
            }),
            z.object({
              groupBy: z.literal("top_urls"),
              response: z.array(getClickAnalyticsResponse["top_urls"]),
            }),
          ]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
