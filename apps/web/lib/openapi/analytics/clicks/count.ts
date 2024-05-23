import { openApiErrorResponses } from "@/lib/openapi/responses";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getClicksCount: ZodOpenApiOperationObject = {
  operationId: "getClicksCount",
  "x-speakeasy-name-override": "count",
  summary: "Retrieve the total clicks count",
  description:
    "Retrieve the total number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(analyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The number of clicks",
      content: {
        "application/json": {
          schema: {
            type: "number",
            description: "The number of clicks matching the specified queries.",
          },
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
