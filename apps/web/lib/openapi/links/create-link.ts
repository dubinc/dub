import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { LinkSchema, createLinkBodySchema } from "@/lib/zod/schemas/links";

export const createLink: ZodOpenApiOperationObject = {
  operationId: "createLink",
  summary: "Create a new link",
  description: "Create a new link for the authenticated workspace.",
  requestParams: {
    query: z.object({
      workspaceId: z
        .string()
        .describe("The ID of the workspace to create the link for."),
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
      description: "The created link",
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
