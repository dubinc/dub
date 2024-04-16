import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getRefererAnalytics: ZodOpenApiOperationObject = {
  operationId: "getRefererAnalytics",
  "x-speakeasy-name-override": "referers",
  summary: "Retrieve referer analytics",
  description:
    "Retrieve the top referers by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top referers by number of clicks",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              referer: z
                .string()
                .describe(
                  "The name of the referer. If unknown, this will be `(direct)`",
                ),
              clicks: z
                .number()
                .describe("The number of clicks from this referer"),
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
