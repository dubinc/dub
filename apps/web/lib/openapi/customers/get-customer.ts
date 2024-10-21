import { openApiErrorResponses } from "@/lib/openapi/responses";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { CustomerSchema } from "../../zod/schemas/customers";

export const getCustomer: ZodOpenApiOperationObject = {
  operationId: "getCustomer",
  "x-speakeasy-name-override": "get",
  summary: "Get a customer",
  description: "Get a customer by externalID for the authenticated workspace.",
  requestParams: {
    path: CustomerSchema.pick({ externalId: true }),
  },
  responses: {
    "200": {
      description: "The customer object.",
      content: {
        "application/json": {
          schema: CustomerSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Customers"],
  security: [{ token: [] }],
};
