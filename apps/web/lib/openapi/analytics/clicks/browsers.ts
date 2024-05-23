import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickAnalyticsResponse } from "@/lib/zod/schemas/clicks-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getBrowsersByClicks: ZodOpenApiOperationObject = {
  operationId: "getBrowsersByClicks",
  "x-speakeasy-name-override": "browsers",
  summary: "Retrieve top browsers by clicks",
  description:
    "Retrieve the top browsers by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(analyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top browsers by number of clicks",
      content: {
        "application/json": {
          schema: z.array(clickAnalyticsResponse["browsers"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
