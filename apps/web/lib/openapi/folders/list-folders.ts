import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  FolderSchema,
  listFoldersQuerySchema,
} from "@/lib/zod/schemas/folders";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listFolders: ZodOpenApiOperationObject = {
  operationId: "listFolders",
  "x-speakeasy-name-override": "list",
  "x-speakeasy-pagination": {
    type: "offsetLimit",
    inputs: [
      {
        name: "page",
        in: "parameters",
        type: "page",
      },
      {
        name: "pageSize",
        in: "parameters",
        type: "limit",
      },
    ],
    outputs: {
      results: "$",
    },
  },
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
