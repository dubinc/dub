import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { GetLinksQuerySchema, LinkSchema } from "@/lib/zod/schemas/links";

export const deleteLink: ZodOpenApiOperationObject = {
  operationId: "deleteLink",
  summary: "Delete a link",
  description: "Delete a link for the authenticated project.",
  requestParams: {
    query: GetLinksQuerySchema.pick({ projectSlug: true }),
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
  },
  tags: ["Links"],
  security: [{ bearerToken: [] }],
};
