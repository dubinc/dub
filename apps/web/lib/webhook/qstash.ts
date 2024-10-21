import { qstash } from "@/lib/cron";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook, WebhookReceiver } from "@prisma/client";
import { WebhookTrigger } from "../types";
import z from "../zod";
import { createWebhookSignature } from "./signature";
import { generateSlackMessage } from "./slack-templates";
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
const publishWebhookEventToQStash = async ({
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

  const receiver = identifyWebhookReceiver(webhook.url);
  const finalPayload = transformPayload({ payload, receiver });
  const signature = await createWebhookSignature(webhook.secret, finalPayload);

  const response = await qstash.publishJSON({
    url: webhook.url,
    body: finalPayload,
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

// Transform the payload for the receiver
const transformPayload = ({
  payload,
  receiver,
}: {
  payload: z.infer<typeof webhookPayloadSchema>;
  receiver: WebhookReceiver;
}) => {
  if (receiver === "slack") {
    return generateSlackMessage(payload.event, payload.data);
  }

  return payload;
};
