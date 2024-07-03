import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { TagSchema, updateTagBodySchema } from "@/lib/zod/schemas/tags";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const updateTag: ZodOpenApiOperationObject = {
  operationId: "updateTag",
  "x-speakeasy-name-override": "update",
  summary: "Update a tag",
  description: "Update a tag in the workspace.",
  requestParams: {
    query: workspaceParamsSchema,
    path: z.object({
      id: z.string().describe("The ID of the tag"),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: updateTagBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated tag.",
      content: {
        "application/json": {
          schema: TagSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ token: [] }],
};
