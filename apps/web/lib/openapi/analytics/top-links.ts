import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getTopLinks: ZodOpenApiOperationObject = {
  operationId: "getTopLinks",
  "x-speakeasy-name-override": "topLinks",
  summary: "Retrieve top links",
  description:
    "Retrieve the top links by number of clicks for a domain or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top links by number of clicks",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              link: z.string().describe("The unique ID of the short link"),
              clicks: z
                .number()
                .describe("The number of clicks from this link"),
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
