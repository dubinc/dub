import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  createLinkBodySchema,
  LinkSchema,
  getLinkInfoQuerySchema,
} from "@/lib/zod/schemas/links";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const createLink: ZodOpenApiOperationObject = {
  operationId: "createLink",
  summary: "Create a new link",
  description: "Create a new link for the authenticated project.",
  requestParams: {
    query: getLinkInfoQuerySchema.pick({ projectSlug: true }),
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
