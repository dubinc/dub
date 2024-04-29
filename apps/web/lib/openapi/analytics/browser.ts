import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  analyticsResponseSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getBrowserAnalytics: ZodOpenApiOperationObject = {
  operationId: "getBrowserAnalytics",
  "x-speakeasy-name-override": "browsers",
  summary: "Retrieve browser analytics",
  description:
    "Retrieve the top browsers by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top browsers by number of clicks",
      content: {
        "application/json": {
          schema: z.array(analyticsResponseSchema["browser"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
