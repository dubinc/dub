import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getBrowserAnalytics: ZodOpenApiOperationObject = {
  operationId: "getBrowserAnalytics",
  summary: "Retrieve browser analytics",
  description:
    "Retrieve the top browsers by number of clicks for a link, a domain, or the authenticated workspace.",
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
      description: "The top browsers by number of clicks",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              browser: z.string().describe("The name of the browser"),
              clicks: z
                .number()
                .describe("The number of clicks from this browser"),
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
