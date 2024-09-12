import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { folderSchema } from "@/lib/zod/schemas/folders";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getFolders: ZodOpenApiOperationObject = {
  operationId: "getFolders",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of folders",
  description: "Retrieve a list of folders for the authenticated workspace.",
  responses: {
    "200": {
      description: "A list of folders",
      content: {
        "application/json": {
          schema: z.array(folderSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Folders"],
  security: [{ token: [] }],
};
