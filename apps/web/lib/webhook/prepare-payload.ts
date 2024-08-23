import { nanoid } from "@dub/utils";
import { WebhookTrigger } from "../types";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";

// Transform the payload to the format expected by the webhook
export const prepareWebhookPayload = (trigger: WebhookTrigger, data: any) => {
  // Unique identifier for the event within Dub
  const eventId = `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(16)}`;

  const payload = webhookPayloadSchema.parse({
    id: eventId,
    data: data,
    event: trigger,
    createdAt: new Date().toISOString(),
  });

  console.info("Webhook payload", payload);

  return payload;
};
