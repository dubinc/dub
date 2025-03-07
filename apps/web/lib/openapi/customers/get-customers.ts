import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ZodOpenApiOperationObject } from "zod-openapi";
import {
  CustomerEnrichedSchema,
  getCustomersQuerySchema,
} from "../../zod/schemas/customers";

export const getCustomers: ZodOpenApiOperationObject = {
  operationId: "getCustomers",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of customers",
  description: "Retrieve a list of customers for the authenticated workspace.",
  requestParams: {
    query: getCustomersQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of customers.",
      content: {
        "application/json": {
          schema: z.array(CustomerEnrichedSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Customers"],
  security: [{ token: [] }],
};
