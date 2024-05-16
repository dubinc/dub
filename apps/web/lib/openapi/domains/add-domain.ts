import { openApiErrorResponses } from "@/lib/openapi/responses";
import { DomainSchema, addDomainBodySchema } from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const addDomain: ZodOpenApiOperationObject = {
  operationId: "addDomain",
  "x-speakeasy-name-override": "add",
  summary: "Add a domain",
  description: "Add a domain to the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema,
  },
  requestBody: {
    content: {
      "application/json": {
        schema: addDomainBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The domain was added.",
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
