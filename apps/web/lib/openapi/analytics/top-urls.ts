import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getTopURLs: ZodOpenApiOperationObject = {
  operationId: "getTopURLs",
  summary: "Retrieve top URLs",
  description:
    "Retrieve the top URLs by number of clicks for a given short link.",
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
      description: "The top URLs by number of clicks",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              url: z.string().describe("The destination URL"),
              clicks: z.number().describe("The number of clicks from this URL"),
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
