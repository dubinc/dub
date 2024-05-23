import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { getClickAnalyticsResponse } from "@/lib/zod/schemas/clicks-analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../../request";

export const getOSByClicks: ZodOpenApiOperationObject = {
  operationId: "getOSByClicks",
  "x-speakeasy-name-override": "os",
  summary: "Retrieve top OS by clicks",
  description:
    "Retrieve the top OS by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(analyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top OS by number of clicks",
      content: {
        "application/json": {
          schema: z.array(getClickAnalyticsResponse["os"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["analytics.clicks"],
  security: [{ token: [] }],
};
