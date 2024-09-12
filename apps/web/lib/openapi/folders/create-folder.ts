import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createFolderBodySchema,
  folderSchema,
} from "@/lib/zod/schemas/folders";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createFolder: ZodOpenApiOperationObject = {
  operationId: "createFolder",
  "x-speakeasy-name-override": "create",
  summary: "Create a new folder",
  description: "Create a new folder for the authenticated workspace.",
  requestBody: {
    content: {
      "application/json": {
        schema: createFolderBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created folder",
      content: {
        "application/json": {
          schema: folderSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Folders"],
  security: [{ token: [] }],
};
