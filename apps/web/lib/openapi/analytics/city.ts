import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  clickAnalyticsQuerySchema,
  getClickAnalyticsResponse,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getCityAnalytics: ZodOpenApiOperationObject = {
  operationId: "getCityAnalytics",
  "x-speakeasy-name-override": "cities",
  summary: "Retrieve city analytics",
  deprecated: true,
  description:
    "Retrieve the top countries by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(
      clickAnalyticsQuerySchema.omit({ groupBy: true }),
    ),
  },
  responses: {
    "200": {
      description: "The top cities by number of clicks",
      content: {
        "application/json": {
          schema: z.array(getClickAnalyticsResponse["city"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
