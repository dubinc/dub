import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickAnalyticsResponse } from "@/lib/zod/schemas/clicks-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getCountriesByClicks: ZodOpenApiOperationObject = {
  operationId: "getCountriesByClicks",
  "x-speakeasy-name-override": "countries",
  summary: "Retrieve top countries by clicks",
  description:
    "Retrieve the top countries by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(analyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top countries by number of clicks",
      content: {
        "application/json": {
          schema: z.array(clickAnalyticsResponse["countries"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
