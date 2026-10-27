import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createDiscountCodeSchema,
  DiscountCodeSchema,
} from "@/lib/zod/schemas/discount";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createDiscountCode: ZodOpenApiOperationObject = {
  operationId: "createDiscountCode",
  "x-speakeasy-name-override": "create",
  summary: "Create a discount code",
  description:
    "Create a discount code for a partner. The partner's group must already have a discount assigned to it, and the discount code must be associated with a link that is not already linked with another discount code.",
  requestBody: {
    content: {
      "application/json": {
        schema: createDiscountCodeSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The created discount code.",
      content: {
        "application/json": {
          schema: DiscountCodeSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Discount Codes"],
  security: [{ token: [] }],
};
