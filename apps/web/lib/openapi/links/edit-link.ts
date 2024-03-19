import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { LinkSchema, createLinkBodySchema } from "@/lib/zod/schemas/links";

export const editLink: ZodOpenApiOperationObject = {
  operationId: "editLink",
  summary: "Edit a link",
  description: "Edit a link for the authenticated workspace.",
  requestParams: {
    query: z.object({
      workspaceId: z
        .string()
        .describe("The ID of the workspace the link belongs to."),
    }),
    path: z.object({
      linkId: z.string().openapi({
        description:
          "The id of the link to edit. You can get this via the `getLinkInfo` endpoint.",
      }),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: createLinkBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The edited link",
      content: {
        "application/json": {
          schema: LinkSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
