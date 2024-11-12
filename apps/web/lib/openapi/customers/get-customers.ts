import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { CustomerSchema } from "../../zod/schemas/customers";

export const getCustomers: ZodOpenApiOperationObject = {
  operationId: "getCustomers",
  "x-speakeasy-name-override": "list",
  summary: "Get a list of customers",
  description: "Get a list of customers for the authenticated workspace.",
  responses: {
    "200": {
      description: "The list of customers.",
      content: {
        "application/json": {
          schema: z.array(CustomerSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Customers"],
  security: [{ token: [] }],
};
