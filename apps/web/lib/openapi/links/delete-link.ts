import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";

export const deleteLink: ZodOpenApiOperationObject = {
  operationId: "deleteLink",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a link",
  description: "Delete a link for the authenticated workspace.",
  requestParams: {
    query: z.object({
      workspaceId: z
        .string()
        .describe("The ID of the workspace the link belongs to."),
    }),
    path: z.object({
      linkId: z.string().openapi({
        description:
          "The id of the link to delete. You can get this via the `getLinkInfo` endpoint.",
      }),
    }),
  },
  responses: {
    "200": {
      description: "The deleted link",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().openapi({ description: "The ID of the link." }),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
