import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { TagSchema } from "@/lib/zod/schemas/tags";

export const getTags: ZodOpenApiOperationObject = {
  operationId: "getTags",
  summary: "Retrieve a list of tags",
  description: "Retrieve a list of tags for the authenticated workspace.",
  requestParams: {
    query: z.object({
      workspaceId: z
        .string()
        .describe("The ID of the workspace to retrieve the tags for."),
    }),
  },
  responses: {
    "200": {
      description: "A list of tags",
      content: {
        "application/json": {
          schema: z.array(TagSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ bearerToken: [] }],
};
