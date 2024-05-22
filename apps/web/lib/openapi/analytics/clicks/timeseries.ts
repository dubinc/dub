import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  clickAnalyticsQuerySchema,
  getClickAnalyticsResponse,
} from "@/lib/zod/schemas/click-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getTimeseriesByClicks: ZodOpenApiOperationObject = {
  operationId: "getTimeseriesByClicks",
  "x-speakeasy-name-override": "timeseries",
  summary: "Retrieve timeseries click analytics",
  description:
    "Retrieve timeseries click analytics for a link, a domain, or the authenticated workspace over a period of time.",
  requestParams: {
    query: workspaceParamsSchema.merge(clickAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The number of clicks over a period of time",
      content: {
        "application/json": {
          schema: z.array(getClickAnalyticsResponse["timeseries"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
