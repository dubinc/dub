import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { LinkSchema, createLinkBodySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const editLink: ZodOpenApiOperationObject = {
  operationId: "editLink",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Edit a link",
  description: "Edit a link for the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema,
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
  security: [{ token: [] }],
};
