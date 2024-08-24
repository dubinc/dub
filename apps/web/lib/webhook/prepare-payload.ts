import { nanoid } from "@dub/utils";
import { WebhookTrigger } from "../types";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";
import { transformLead, transformSale } from "./transform";

// Transform the payload to the format expected by the webhook
export const prepareWebhookPayload = (trigger: WebhookTrigger, data: any) => {
  switch (trigger) {
    case "lead.created":
      data = transformLead(data);
      break;
    case "sale.created":
      data = transformSale(data);
      break;
    default:
      break;
  }

  return webhookPayloadSchema.parse({
    id: `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`,
    data: data,
    event: trigger,
    createdAt: new Date().toISOString(),
  });
};
