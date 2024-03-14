import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getOSAnalytics: ZodOpenApiOperationObject = {
  operationId: "getOSAnalytics",
  summary: "Retrieve OS analytics",
  description:
    "Retrieve the top OS by number of clicks for a link, a domain, or the authenticated workspace.",
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
      description: "The top OS by number of clicks",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              os: z.string().describe("The name of the OS"),
              clicks: z.number().describe("The number of clicks from this OS"),
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
