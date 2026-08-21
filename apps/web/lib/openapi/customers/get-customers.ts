import { openApiErrorResponses } from "@/lib/openapi/responses";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";
import {
  CustomerEnrichedSchema,
  getCustomersQuerySchema,
} from "../../zod/schemas/customers";

export const getCustomers: ZodOpenApiOperationObject = {
  operationId: "getCustomers",
  "x-speakeasy-name-override": "list",
  "x-speakeasy-pagination": {
    type: "cursor",
    inputs: [
      {
        name: "startingAfter",
        in: "parameters",
        type: "cursor",
      },
    ],
    outputs: {
      nextCursor: "$[-1].id",
    },
  },
  summary: "List all customers",
  description:
    "Retrieve a paginated list of customers for the authenticated workspace.",
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
