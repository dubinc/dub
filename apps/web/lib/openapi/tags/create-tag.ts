import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { createTagBodySchema, tagSchema } from "@/lib/zod/schemas/tags";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const createTag: ZodOpenApiOperationObject = {
  operationId: "createTag",
  summary: "Create a new tag",
  description: "Create a new tag for the authenticated project.",
  requestParams: {
    path: z.object({
      projectSlug: z
        .string()
        .describe(
          "The slug for the project to create tags for. E.g. for `app.dub.co/acme`, the `projectSlug` is `acme`.",
        ),
    }),
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
          schema: tagSchema
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ bearerToken: [] }],
};
