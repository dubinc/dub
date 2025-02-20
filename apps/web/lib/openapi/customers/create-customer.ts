import { openApiErrorResponses } from "@/lib/openapi/responses";
import { ZodOpenApiOperationObject } from "zod-openapi";
import {
  createCustomerBodySchema,
  CustomerSchema,
} from "../../zod/schemas/customers";

export const createCustomer: ZodOpenApiOperationObject = {
  operationId: "createCustomer",
  "x-speakeasy-name-override": "create",
  summary: "Create a customer",
  description:
    "[Deprecated]: Customer creation can only be done via tracking a lead event. Use the /track/lead endpoint instead.",
  deprecated: true,
  requestBody: {
    content: {
      "application/json": {
        schema: createCustomerBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The customer was created.",
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
