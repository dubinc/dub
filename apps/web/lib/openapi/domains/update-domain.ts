import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  DomainSchema,
  updateDomainBodySchema,
} from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const updateDomain: ZodOpenApiOperationObject = {
  operationId: "updateDomain",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a domain",
  description: "Update a domain for the authenticated workspace.",
  requestParams: {
    path: DomainSchema.pick({ slug: true }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: updateDomainBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The domain was updated.",
      content: {
        "application/json": {
          schema: DomainSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Domains"],
  security: [{ token: [] }],
};
