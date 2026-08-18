import { openApiErrorResponses } from "@/lib/openapi/responses";
import { DiscountCodeSchema } from "@/lib/zod/schemas/discount";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const deleteDiscountCode: ZodOpenApiOperationObject = {
  operationId: "deleteDiscountCode",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a discount code",
  description:
    "Delete a discount code for a partner. This will also disable the code in your connected Stripe or Shopify account.",
  requestParams: {
    path: z.object({
      id: DiscountCodeSchema.shape.id.describe(
        "The ID of the discount code to delete.",
      ),
    }),
  },
  responses: {
    "200": {
      description: "The deleted discount code ID.",
      content: {
        "application/json": {
          schema: DiscountCodeSchema.pick({ id: true }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Discount Codes"],
  security: [{ token: [] }],
};
