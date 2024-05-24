import { openApiErrorResponses } from "@/lib/openapi/responses";
import { DomainSchema } from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const setPrimaryDomain: ZodOpenApiOperationObject = {
  operationId: "setPrimaryDomain",
  "x-speakeasy-name-override": "setPrimary",
  "x-speakeasy-max-method-params": 1,
  summary: "Set a domain as primary",
  description: "Set a domain as primary for the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema,
    path: DomainSchema.pick({ slug: true }),
  },
  responses: {
    "200": {
      description: "The domain was set as primary",
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
