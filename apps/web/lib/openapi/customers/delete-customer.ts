import { openApiErrorResponses } from "@/lib/openapi/responses";
import { CustomerSchema } from "@/lib/zod/schemas/customers";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const deleteCustomer: ZodOpenApiOperationObject = {
  operationId: "deleteCustomer",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a customer",
  description: "Delete a customer from a workspace.",
  requestParams: {
    path: CustomerSchema.pick({ id: true }),
  },
  responses: {
    "200": {
      description: "The customer was deleted.",
      content: {
        "application/json": {
          schema: CustomerSchema.pick({ id: true }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Customers"],
  security: [{ token: [] }],
};
