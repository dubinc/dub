import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  RegisterDomainSchema,
  registerDomainSchema,
} from "@/lib/zod/schemas/domains";
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
        schema: registerDomainSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The domain was registered.",
      content: {
        "application/json": {
          schema: RegisterDomainSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Domains"],
  security: [{ token: [] }],
};
