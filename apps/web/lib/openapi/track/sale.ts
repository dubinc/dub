import { openApiErrorResponses } from "@/lib/openapi/responses";
import { idempotencyKeyHeaderSchema } from "@/lib/zod/schemas/idempotency";
import {
  trackSaleRequestSchema,
  trackSaleResponseSchema,
} from "@/lib/zod/schemas/sales";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const trackSale: ZodOpenApiOperationObject = {
  operationId: "trackSale",
  "x-speakeasy-name-override": "sale",
  summary: "Track a sale",
  description: "Track a sale for a short link.",
  requestParams: {
    header: z.object({
      "Idempotency-Key": idempotencyKeyHeaderSchema,
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: trackSaleRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "A sale was tracked.",
      content: {
        "application/json": {
          schema: trackSaleResponseSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Track"],
  security: [{ token: [] }],
};
