import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { getLinksQuerySchema, LinkSchema } from "@/lib/zod/schemas/links";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const deleteLink: ZodOpenApiOperationObject = {
  operationId: "deleteLink",
  summary: "Delete a link",
  description: "Delete a link for the authenticated project.",
  requestParams: {
    query: getLinksQuerySchema.pick({ projectSlug: true }),
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
          schema: LinkSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
