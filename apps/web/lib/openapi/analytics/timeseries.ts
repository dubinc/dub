import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getTimeseriesAnalytics: ZodOpenApiOperationObject = {
  operationId: "getTimeseriesAnalytics",
  "x-speakeasy-name-override": "timeseries",
  summary: "Retrieve timeseries analytics",
  description:
    "Retrieve the number of clicks for a link, a domain, or the authenticated workspace over a period of time.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The number of clicks over a period of time",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              start: z
                .string()
                .describe("The starting timestamp of the interval"),
              clicks: z
                .number()
                .describe("The number of clicks in the interval"),
            }),
          ),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
