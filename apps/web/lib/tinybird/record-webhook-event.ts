import { waitUntil } from "@vercel/functions";
import { webhookEventSchemaTB } from "../zod/schemas/webhooks";
import { tb, tbOld } from "./client";

export const recordWebhookEventTB = tb.buildIngestEndpoint({
  datasource: "dub_webhook_events",
  event: webhookEventSchemaTB.omit({ timestamp: true }),
});

// TODO: Remove after Tinybird migration
export const recordWebhookEventTBOld = tbOld.buildIngestEndpoint({
  datasource: "dub_webhook_events",
  event: webhookEventSchemaTB.omit({ timestamp: true }),
});

export const recordWebhookEvent = async (payload: any) => {
  waitUntil(recordWebhookEventTBOld(payload));
  return await recordWebhookEventTB(payload);
};
