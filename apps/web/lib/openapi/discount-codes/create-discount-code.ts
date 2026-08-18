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
    "Create a discount code for a partner. A discount must already be assigned to the partner's group, and the specified link cannot already have a discount code.",
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
