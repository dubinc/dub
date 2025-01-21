import { qstash } from "@/lib/cron";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { Webhook, WebhookReceiver } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { formatEventForSegment } from "../integrations/segment/transform";
import { createSegmentBasicAuthHeader } from "../integrations/segment/utils";
import { formatEventForSlack } from "../integrations/slack/transform";
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

      // Integration specific headers
      ...(receiver === "segment" && {
        "Upstash-Forward-Authorization": createSegmentBasicAuthHeader(
          webhook.secret,
        ),
      }),
    },
    callback: callbackUrl.href,
    failureCallback: callbackUrl.href,
    ...(process.env.NODE_ENV === "test" && { delay: 5 }),
  });

  if (!response.messageId) {
    console.error("Failed to publish webhook event to QStash", response);
  }

  return response;
};

// Transform the payload based on the integration
const transformPayload = ({
  payload,
  receiver,
}: {
  payload: z.infer<typeof webhookPayloadSchema>;
  receiver: WebhookReceiver;
}) => {
  switch (receiver) {
    case "slack":
      return formatEventForSlack(payload);
    case "segment":
      return formatEventForSegment(payload);
    default:
      return payload;
  }
};
