import { leadWebhookEventSchema } from "@/lib/webhook/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const leadCreatedEvent: ZodOpenApiOperationObject = {
  operationId: "leadCreatedEvent",
  "x-speakeasy-name-override": "leadCreated",
  summary: "Lead created",
  description: "A webhook that is called when a lead is created.",
  requestBody: {
    description: "Details about the lead that was created.",
    content: {
      "application/json": {
        schema: leadWebhookEventSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The webhook was processed successfully.",
    },
  },
};
