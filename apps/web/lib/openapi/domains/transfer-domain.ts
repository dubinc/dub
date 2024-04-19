import { openApiErrorResponses } from "@/lib/openapi/responses";
import { DomainSchema, transferDomainBodySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const transferDomain: ZodOpenApiOperationObject = {
  operationId: "transferDomain",
  "x-speakeasy-name-override": "transfer",
  summary: "Transfer a domain",
  description:
    "Transfer a domain to another workspace within the authenticated account.",
  requestParams: {
    query: workspaceParamsSchema,
    path: DomainSchema.pick({ slug: true }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: transferDomainBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The domain transfer initiated",
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
