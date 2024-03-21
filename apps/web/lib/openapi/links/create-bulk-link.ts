import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { LinkSchema, createLinkBodySchema } from "@/lib/zod/schemas/links";

export const createBulkLink: ZodOpenApiOperationObject = {
  operationId: "bulkCreateLinks",
  summary: "Bulk create links",
  description: "Bulk create up to 100 links for the authenticated workspace.",
  requestParams: {
    query: z.object({
      workspaceId: z
        .string()
        .describe("The ID of the workspace to create the link for."),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: z.array(createLinkBodySchema),
      },
    },
  },
  responses: {
    "200": {
      description: "The created links",
      content: {
        "application/json": {
          schema: z.array(LinkSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
