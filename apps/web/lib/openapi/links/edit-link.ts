import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  CreateLinkBodySchema,
  LinkSchema,
  GetLinkInfoQuerySchema,
} from "@/lib/zod/schemas/links";
import z from "@/lib/zod";

export const editLink: ZodOpenApiOperationObject = {
  operationId: "editLink",
  summary: "Edit a link",
  description: "Edit a link for the authenticated project.",
  requestParams: {
    query: GetLinkInfoQuerySchema.pick({ projectSlug: true }),
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
        schema: CreateLinkBodySchema,
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
  },
  tags: ["Links"],
};
