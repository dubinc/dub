import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickAnalyticsResponse } from "@/lib/zod/schemas/clicks-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getTimeseriesByClicks: ZodOpenApiOperationObject = {
  operationId: "getTimeseriesByClicks",
  "x-speakeasy-name-override": "timeseries",
  summary: "Retrieve timeseries click analytics",
  description:
    "Retrieve timeseries click analytics for a link, a domain, or the authenticated workspace over a period of time.",
  requestParams: {
    query: workspaceParamsSchema.merge(analyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The number of clicks over a period of time",
      content: {
        "application/json": {
          schema: z.array(clickAnalyticsResponse["timeseries"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
