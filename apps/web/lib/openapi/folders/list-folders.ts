import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  FolderSchema,
  listFoldersQuerySchema,
} from "@/lib/zod/schemas/folders";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const listFolders: ZodOpenApiOperationObject = {
  operationId: "listFolders",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of folders",
  description: "Retrieve a list of folders for the authenticated workspace.",
  requestParams: {
    query: listFoldersQuerySchema,
  },
  responses: {
    "200": {
      description: "A list of folders",
      content: {
        "application/json": {
          schema: z.array(FolderSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Folders"],
  security: [{ token: [] }],
};
