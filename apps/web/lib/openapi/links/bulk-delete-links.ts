import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const bulkDeleteLinks: ZodOpenApiOperationObject = {
  operationId: "bulkDeleteLinks",
  "x-speakeasy-name-override": "deleteMany",
  summary: "Bulk delete links",
  description: "Bulk delete up to 100 links for the authenticated workspace.",
  requestParams: {
    query: z.object({
      linkIds: z
        .array(z.string())
        .describe(
          "Comma-separated list of link IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.",
        )
        .openapi({ example: ["clux0rgak00011...", "clux0rgak00022..."] }),
    }),
  },
  responses: {
    "200": {
      description: "The deleted links count.",
      content: {
        "application/json": {
          schema: z.object({
            deletedCount: z.number().openapi({
              description: "The number of links deleted.",
            }),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
