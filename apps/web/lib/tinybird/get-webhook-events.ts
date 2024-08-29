import z from "../zod";
import { webhookEventSchemaTB } from "../zod/schemas/webhooks";
import { tb } from "./client";

export const getWebhookEvents = tb.buildPipe({
  pipe: "get_webhook_events",
  parameters: z.object({
    webhookId: z.string(),
  }),
  data: webhookEventSchemaTB,
});
