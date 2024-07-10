import { openApiErrorResponses } from "@/lib/openapi/responses";
import { DomainSchema } from "@/lib/zod/schemas/domains";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const deleteDomain: ZodOpenApiOperationObject = {
  operationId: "deleteDomain",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a domain",
  description:
    "Delete a domain from a workspace. It cannot be undone. This will also delete all the links associated with the domain.",
  requestParams: {
    path: DomainSchema.pick({ slug: true }),
  },
  responses: {
    "200": {
      description: "The domain was deleted.",
      content: {
        "application/json": {
          schema: DomainSchema.pick({ slug: true }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Domains"],
  security: [{ token: [] }],
};
