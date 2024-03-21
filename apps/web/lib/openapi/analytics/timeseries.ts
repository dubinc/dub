import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getTimeseriesAnalytics: ZodOpenApiOperationObject = {
  operationId: "getTimeseriesAnalytics",
  summary: "Retrieve timeseries analytics",
  description:
    "Retrieve the number of clicks for a link, a domain, or the authenticated workspace over a period of time.",
  requestParams: {
    query: z
      .object({
        workspaceId: z
          .string()
          .describe("The ID of the workspace the link belongs to."),
      })
      .merge(getAnalyticsQuerySchema),
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
  security: [{ bearerToken: [] }],
};
