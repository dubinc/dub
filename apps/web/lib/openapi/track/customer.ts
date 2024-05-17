import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  trackCustomerRequestSchema,
  trackCustomerResponsetSchema,
} from "@/lib/zod/schemas/customers";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const trackCustomer: ZodOpenApiOperationObject = {
  operationId: "trackCustomer",
  "x-speakeasy-name-override": "customer",
  summary: "Track a customer.",
  description: "Track a customer for an authenticated workspace.",
  requestBody: {
    content: {
      "application/json": {
        schema: trackCustomerRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "A customer was tracked.",
      content: {
        "application/json": {
          schema: trackCustomerResponsetSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Track"],
  security: [{ token: [] }],
};
