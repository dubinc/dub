import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { DomainSchema, getDomainsQuerySchema } from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const listDomains: ZodOpenApiOperationObject = {
  operationId: "listDomains",
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
  summary: "Retrieve a list of domains",
  description:
    "Retrieve a list of domains associated with the authenticated workspace.",
  requestParams: {
    query: getDomainsQuerySchema,
  },
  responses: {
    "200": {
      description: "The domains were retrieved.",
      content: {
        "application/json": {
          schema: z.array(DomainSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Domains"],
  security: [{ token: [] }],
};
