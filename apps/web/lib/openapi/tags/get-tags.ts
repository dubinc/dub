import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { projectOrWorkspaceSchema } from "@/lib/zod/schemas/projects";
import { TagSchema } from "@/lib/zod/schemas/tags";

export const getTags: ZodOpenApiOperationObject = {
  operationId: "getTags",
  summary: "Retrieve a list of tags",
  description: "Retrieve a list of tags for the authenticated project.",
  requestParams: {
    query: projectOrWorkspaceSchema,
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
