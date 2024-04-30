import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  analyticsResponseSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getCityAnalytics: ZodOpenApiOperationObject = {
  operationId: "getCityAnalytics",
  "x-speakeasy-name-override": "cities",
  summary: "Retrieve city analytics",
  description:
    "Retrieve the top cities by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top cities by number of clicks",
      content: {
        "application/json": {
          schema: z.array(analyticsResponseSchema["city"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
