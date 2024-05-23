import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickAnalyticsResponse } from "@/lib/zod/schemas/clicks-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getTopLinksByClicks: ZodOpenApiOperationObject = {
  operationId: "getTopLinksByClicks",
  "x-speakeasy-name-override": "topLinks",
  summary: "Retrieve top links by clicks",
  description:
    "Retrieve the top links by number of clicks for a domain or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(analyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top links by number of clicks",
      content: {
        "application/json": {
          schema: z.array(clickAnalyticsResponse["top_links"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
