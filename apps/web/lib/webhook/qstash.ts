import { qstash } from "@/lib/cron";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook, WebhookReceiver } from "@prisma/client";
import * as z from "zod/v4";
import { formatEventForSegment } from "../integrations/segment/transform";
import { createSegmentBasicAuthHeader } from "../integrations/segment/utils";
import { formatEventForSlack } from "../integrations/slack/transform";
import { createWebhookSignature } from "./signature";
import { prepareWebhookPayload } from "./transform";
import type { WebhookTrigger } from "./types";
import { WebhookEventPayload } from "./types";
import { identifyWebhookReceiver } from "./utils";

export type WebhookEnqueueResult = {
  webhookId: string;
  ok: boolean;
  messageId?: string;
  error?: unknown;
};

// Send webhooks to multiple webhooks
export const sendWebhooks = async ({
  webhooks,
  trigger,
  data,
}: {
  webhooks: Pick<Webhook, "id" | "url" | "secret">[];
  trigger: WebhookTrigger;
  data: WebhookEventPayload;
}): Promise<WebhookEnqueueResult[]> => {
  if (webhooks.length === 0) {
    return [];
  }

  const payload = prepareWebhookPayload(trigger, data);

  const results = await Promise.allSettled(
    webhooks.map((webhook) =>
      publishWebhookEventToQStash({ webhook, payload }),
    ),
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return {
        webhookId: webhooks[i].id,
        ok: true,
        messageId: result.value.messageId,
      };
    }

    return {
      webhookId: webhooks[i].id,
      ok: false,
      error: result.reason,
    };
  });
};

// publish webhook event to QStash
const publishWebhookEventToQStash = async ({
  webhook,
  payload,
}: {
  webhook: Pick<Webhook, "id" | "url" | "secret">;
  payload: z.infer<typeof webhookPayloadSchema>;
}) => {
  const searchParams = {
    webhookId: webhook.id,
    eventId: payload.id,
    event: payload.event,
  };

  const callbackUrl = buildCallbackUrl(
    `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`,
    searchParams,
  );

  const failureCallbackUrl = buildCallbackUrl(
    `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`,
    {
      ...searchParams,
      failed: "true",
    },
  );

  const receiver = identifyWebhookReceiver(webhook.url);
  const finalPayload = transformPayload({ payload, receiver });
  const signature = await createWebhookSignature(webhook.secret, finalPayload);

  // TODO:
  // Add deduplicationId to the webhook

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
    failureCallback: failureCallbackUrl.href,
    ...(process.env.NODE_ENV === "test" && { delay: 5 }),
  });

  if (!response.messageId) {
    throw new Error("Failed to publish webhook event to QStash");
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("Published webhook event to QStash", {
      ...response,
      payload: finalPayload,
    });
  }

  return {
    ...response,
    webhookEventId: payload.id,
  };
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

function buildCallbackUrl(base: string, params: Record<string, string>): URL {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return url;
}
