import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  CustomerSchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const updateCustomer: ZodOpenApiOperationObject = {
  operationId: "updateCustomer",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a customer",
  description: "Update a customer for the authenticated workspace.",
  requestParams: {
    path: CustomerSchema.pick({ externalId: true }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: updateCustomerBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The customer was updated.",
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
