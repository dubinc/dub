import { openApiErrorResponses } from "@/lib/openapi/responses";
import { ZodOpenApiOperationObject } from "zod-openapi";
import {
  CustomerSchema,
  getCustomersQuerySchema,
} from "../../zod/schemas/customers";

export const getCustomer: ZodOpenApiOperationObject = {
  operationId: "getCustomer",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a customer",
  description: "Retrieve a customer by ID for the authenticated workspace.",
  requestParams: {
    path: CustomerSchema.pick({ id: true }),
    query: getCustomersQuerySchema.pick({ includeExpandedFields: true }),
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
