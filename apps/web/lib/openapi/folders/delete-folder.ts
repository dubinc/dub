import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const deleteFolder: ZodOpenApiOperationObject = {
  operationId: "deleteFolder",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a folder",
  description:
    "Delete a folder from the workspace. All existing links will still work, but they will no longer be associated with this folder.",
  requestParams: {
    path: z.object({
      id: z.string().describe("The ID of the folder to delete."),
    }),
  },
  responses: {
    "200": {
      description: "The deleted folder ID.",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().describe("The ID of the deleted folder."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Folders"],
  security: [{ token: [] }],
};
