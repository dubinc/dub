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
    "Delete a discount code for a partner by its unique ID or alphanumeric code. This will also disable the code in your connected discount provider (Stripe, Shopify, or custom via `disccount.deleted` webhook).",
  requestParams: {
    path: z.object({
      idOrCode: DiscountCodeSchema.shape.id.describe(
        "The unique ID (e.g. `dcode_...`) or alphanumeric code (e.g. `ABC123`) of the discount code to delete.",
      ),
    }),
  },
  responses: {
    "200": {
      description: "The deleted discount code unique ID (e.g. `dcode_...`).",
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
