import { webhookEventSchemaTB } from "../zod/schemas/webhooks";
import { tb } from "./client";

export const recordWebhookEvent = tb.buildIngestEndpoint({
  datasource: "dub_webhook_events",
  event: webhookEventSchemaTB,
});
