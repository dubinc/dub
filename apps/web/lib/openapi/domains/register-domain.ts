import { openApiErrorResponses } from "@/lib/openapi/responses";
import { DomainSchema, registerDomainBodySchema } from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const registerDomain: ZodOpenApiOperationObject = {
  operationId: "registerDomain",
  "x-speakeasy-name-override": "register",
  summary: "Register a domain",
  description:
    "Register a domain for the authenticated workspace. Only available for Enterprise Plans.",
  requestBody: {
    content: {
      "application/json": {
        schema: registerDomainBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The domain was registered.",
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
