import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { GetLinksQuerySchema, LinkSchema } from "@/lib/zod/schemas/links";

export const getLinks: ZodOpenApiOperationObject = {
  operationId: "getLinks",
  summary: "Retrieve a list of links",
  description:
    "Retrieve a list of links for the authenticated project. The list will be paginated and the provided query parameters allow filtering the returned links.",
  requestParams: {
    query: GetLinksQuerySchema,
  },
  responses: {
    "200": {
      description: "A list of links",
      content: {
        "application/json": {
          schema: z.array(LinkSchema),
        },
      },
    },
  },
  tags: ["Links"],
};
