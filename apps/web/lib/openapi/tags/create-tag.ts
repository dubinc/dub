import { openApiErrorResponses } from "@/lib/openapi/responses";
import { createTagBodySchema, LinkTagSchema } from "@/lib/zod/schemas/tags";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createTag: ZodOpenApiOperationObject = {
  operationId: "createTag",
  "x-speakeasy-name-override": "create",
  summary: "Create a tag",
  description: "Create a tag for the authenticated workspace.",
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
          schema: LinkTagSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ token: [] }],
};
