import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  analyticsResponseSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getCountryAnalytics: ZodOpenApiOperationObject = {
  operationId: "getCountryAnalytics",
  "x-speakeasy-name-override": "countries",
  summary: "Retrieve country analytics",
  description:
    "Retrieve the top countries by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top countries by number of clicks",
      content: {
        "application/json": {
          schema: z.array(analyticsResponseSchema["country"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
