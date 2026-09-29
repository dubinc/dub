import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  listPartnerTagsQuerySchema,
  listPartnerTagsResponseSchema,
} from "@/lib/zod/schemas/partner-tags";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const listPartnerTags: ZodOpenApiOperationObject = {
  operationId: "listPartnerTags",
  "x-speakeasy-name-override": "list",
  summary: "List all partner tags",
  description:
    "Retrieve a cursor-paginated list of partner tags for your partner program.",
  requestParams: {
    query: listPartnerTagsQuerySchema,
  },
  responses: {
    "200": {
      description: "A paginated list of partner tags.",
      content: {
        "application/json": {
          schema: listPartnerTagsResponseSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partner Tags"],
  security: [{ token: [] }],
};
