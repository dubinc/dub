import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import { projectOrWorkspaceSchema } from "@/lib/zod/schemas/projects";
import { createTagBodySchema, TagSchema } from "@/lib/zod/schemas/tags";

export const createTag: ZodOpenApiOperationObject = {
  operationId: "createTag",
  summary: "Create a new tag",
  description: "Create a new tag for the authenticated project.",
  requestParams: {
    query: projectOrWorkspaceSchema,
  },
  requestBody: {
    content: {
      "application/json": {
        schema: createTagBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created tag",
      content: {
        "application/json": {
          schema: TagSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ bearerToken: [] }],
};
