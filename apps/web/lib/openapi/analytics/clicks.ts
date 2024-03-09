import { openApiErrorResponses } from "@/lib/openapi/responses";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getClicksAnalytics: ZodOpenApiOperationObject = {
  operationId: "getClicksAnalytics",
  summary: "Retrieve clicks analytics",
  description:
    "Retrieve the number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: getAnalyticsQuerySchema,
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
  security: [{ bearerToken: [] }],
};
