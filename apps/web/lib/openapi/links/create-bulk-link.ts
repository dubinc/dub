import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  CreateLinkBodySchema,
  LinkSchema,
  GetLinkInfoQuerySchema,
} from "@/lib/zod/schemas/links";
import z from "@/lib/zod";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const createBulkLink: ZodOpenApiOperationObject = {
  operationId: "bulkCreateLinks",
  summary: "Bulk create links",
  description: "Bulk create up to 100 links for the authenticated project.",
  requestParams: {
    query: GetLinkInfoQuerySchema.pick({ projectSlug: true }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: z.array(CreateLinkBodySchema),
      },
    },
  },
  responses: {
    "200": {
      description: "The created links",
      content: {
        "application/json": {
          schema: z.array(LinkSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
