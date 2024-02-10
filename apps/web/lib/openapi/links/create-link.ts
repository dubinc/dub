import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  CreateLinkBodySchema,
  LinkSchema,
  GetLinkInfoQuerySchema,
} from "@/lib/zod/schemas/links";

export const createLink: ZodOpenApiOperationObject = {
  operationId: "createLink",
  summary: "Create a new link",
  description: "Create a new link for the authenticated project.",
  requestParams: {
    query: GetLinkInfoQuerySchema.pick({ projectSlug: true }),
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
      description: "The created link",
      content: {
        "application/json": {
          schema: LinkSchema,
        },
      },
    },
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
