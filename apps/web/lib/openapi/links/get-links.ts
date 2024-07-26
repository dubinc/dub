import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getLinksQuerySchema, LinkSchema } from "@/lib/zod/schemas/links";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getLinks: ZodOpenApiOperationObject = {
  operationId: "getLinks",
  "x-speakeasy-name-override": "list",
  "x-speakeasy-pagination": {
    type: "offsetLimit",
    inputs: [
      {
        name: "page",
        in: "parameters",
        type: "page",
      },
      {
        name: "pageSize",
        in: "parameters",
        type: "limit",
      },
    ],
    outputs: {
      results: "$",
    },
  },
  summary: "Retrieve a list of links",
  description:
    "Retrieve a paginated list of links for the authenticated workspace.",
  requestParams: {
    query: getLinksQuerySchema,
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
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
