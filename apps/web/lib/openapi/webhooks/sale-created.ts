import { saleWebhookEventSchema } from "@/lib/webhook/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const SaleCreatedEvent: ZodOpenApiOperationObject = {
  "x-speakeasy-include": true,
  "x-speakeasy-name-override": "SaleCreatedEvent",
  summary: "Sale created",
  description: "A webhook that is called when a sale is created.",
  requestBody: {
    description: "Details about the sale that was created.",
    content: {
      "application/json": {
        schema: saleWebhookEventSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The webhook was processed successfully.",
    },
  },
};
