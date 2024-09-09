import { leadWebhookEventSchema } from "@/lib/webhook/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const LeadCreatedEvent: ZodOpenApiOperationObject = {
  "x-speakeasy-include": true,
  "x-speakeasy-name-override": "LeadCreatedEvent",
  summary: "Lead created event",
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
