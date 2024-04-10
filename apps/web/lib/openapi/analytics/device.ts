import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { requestParamsSchema } from "../request";

export const getDeviceAnalytics: ZodOpenApiOperationObject = {
  operationId: "getDeviceAnalytics",
  "x-speakeasy-name-override": "devices",
  summary: "Retrieve device analytics",
  description:
    "Retrieve the top devices by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: requestParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top devices by number of clicks",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              device: z.string().describe("The name of the device"),
              clicks: z
                .number()
                .describe("The number of clicks from this device"),
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
