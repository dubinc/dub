import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const deleteTag: ZodOpenApiOperationObject = {
  operationId: "deleteTag",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a tag",
  description:
    "Delete a tag from the workspace. All existing links will still work, but they will no longer be associated with this tag.",
  requestParams: {
    path: z.object({
      id: z.string().describe("The ID of the tag to delete."),
    }),
  },
  responses: {
    "200": {
      description: "The deleted tag ID.",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().describe("The ID of the deleted tag."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ token: [] }],
};
