import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  DiscountCodeSchema,
  DiscountCodeWebhookSchema,
  updateDiscountCodeSchema,
} from "@/lib/zod/schemas/discount";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const updateDiscountCode: ZodOpenApiOperationObject = {
  operationId: "updateDiscountCode",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a discount code",
  description:
    "Update a custom discount code. This is only available when the discount provider is `custom`.",
  requestParams: {
    path: z.object({
      id: DiscountCodeSchema.shape.id.describe(
        "The ID of the discount code to update.",
      ),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: updateDiscountCodeSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated discount code.",
      content: {
        "application/json": {
          schema: DiscountCodeWebhookSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Discount Codes"],
  security: [{ token: [] }],
};
