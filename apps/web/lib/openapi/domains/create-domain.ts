import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  DomainSchema,
  createDomainBodySchema,
} from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const createDomain: ZodOpenApiOperationObject = {
  operationId: "createDomain",
  "x-speakeasy-name-override": "create",
  summary: "Create a domain",
  description: "Create a domain for the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema,
  },
  requestBody: {
    content: {
      "application/json": {
        schema: createDomainBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The domain was created.",
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
