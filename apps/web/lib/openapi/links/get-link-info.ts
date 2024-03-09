import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import { workspaceIdSchema } from "@/lib/zod";
import { getLinkInfoQuerySchema, LinkSchema } from "@/lib/zod/schemas/links";

export const getLinkInfo: ZodOpenApiOperationObject = {
  operationId: "getLinkInfo",
  summary: "Retrieve a link",
  description: "Retrieve the info for a link from their domain and key.",
  requestParams: {
    query: workspaceIdSchema.merge(getLinkInfoQuerySchema),
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
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
