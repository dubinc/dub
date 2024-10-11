import { qstash } from "@/lib/cron";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import z from "../zod";
import { createWebhookSignature } from "./signature";
import { prepareWebhookPayload } from "./transform";
import { EventDataProps } from "./types";
import { identifyWebhookReceiver } from "./utils";

// Send webhooks to multiple webhooks
export const sendWebhooks = async ({
  webhooks,
  trigger,
  data,
}: {
  webhooks: Pick<Webhook, "id" | "url" | "secret">[];
  trigger: WebhookTrigger;
  data: EventDataProps;
}) => {
  if (webhooks.length === 0) {
    return;
  }

  const payload = prepareWebhookPayload(trigger, data);

  return await Promise.all(
    webhooks.map((webhook) =>
      publishWebhookEventToQStash({ webhook, payload }),
    ),
  );
};

// Publish webhook event to QStash
export const publishWebhookEventToQStash = async ({
  webhook,
  payload,
}: {
  webhook: Pick<Webhook, "id" | "url" | "secret">;
  payload: z.infer<typeof webhookPayloadSchema>;
}) => {
  const callbackUrl = new URL(`${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`);
  callbackUrl.searchParams.append("webhookId", webhook.id);
  callbackUrl.searchParams.append("eventId", payload.id);
  callbackUrl.searchParams.append("event", payload.event);

  const signature = await createWebhookSignature(webhook.secret, payload);
  const receiver = identifyWebhookReceiver(webhook.url);

  const response = await qstash.publishJSON({
    url: webhook.url,
    body: payload,
    headers: {
      "Dub-Signature": signature,
      "Upstash-Hide-Headers": "true",
    },
    callback: callbackUrl.href,
    failureCallback: callbackUrl.href,
  });

  if (!response.messageId) {
    console.error("Failed to publish webhook event to QStash", response);
  }

  return response;
};

// const finalPayload =
// receiver === "slack"
//   ? generateLinkTemplate(payload.data, payload.event)
//   : payload;
