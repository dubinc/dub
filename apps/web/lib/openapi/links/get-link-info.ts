import { ZodOpenApiOperationObject } from "zod-openapi";

import { GetLinkInfoQuerySchema, LinkSchema } from "@/lib/zod/schemas/links";

export const getLinkInfo: ZodOpenApiOperationObject = {
  operationId: "getLinkInfo",
  summary: "Retrieve a link",
  description: "Retrieve the info for a link from their domain and key.",
  requestParams: {
    query: GetLinkInfoQuerySchema,
  },
  responses: {
    "200": {
      description: "The retrieved link",
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
