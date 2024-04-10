import { openApiErrorResponses } from "@/lib/openapi/responses";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getClicksAnalytics: ZodOpenApiOperationObject = {
  operationId: "getClicksAnalytics",
  "x-speakeasy-name-override": "clicks",
  summary: "Retrieve clicks analytics",
  description:
    "Retrieve the number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The number of clicks",
      content: {
        "application/json": {
          schema: {
            type: "number",
            description: "The number of clicks",
          },
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
