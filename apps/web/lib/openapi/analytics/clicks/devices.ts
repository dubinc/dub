import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  clickAnalyticsQuerySchema,
  getClickAnalyticsResponse,
} from "@/lib/zod/schemas/clicks-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getDevicesByClicks: ZodOpenApiOperationObject = {
  operationId: "getDevicesByClicks",
  "x-speakeasy-name-override": "devices",
  summary: "Retrieve top devices by clicks",
  description:
    "Retrieve the top devices by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(clickAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top devices by number of clicks",
      content: {
        "application/json": {
          schema: z.array(getClickAnalyticsResponse["devices"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
