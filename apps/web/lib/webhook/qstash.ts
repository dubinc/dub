import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import z from "../zod";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { createWebhookSignature } from "./signature";
import { prepareWebhookPayload } from "./transform";

export const sendWebhooks = async (
  trigger: WebhookTrigger,
  props: {
    webhooks: Pick<Webhook, "id" | "url" | "secret">[];
    data: any;
  },
) => {
  const { webhooks, data } = props;

  if (webhooks.length === 0) {
    return;
  }

  const payload = prepareWebhookPayload(trigger, data);

  return await Promise.all(
    webhooks.map((webhook) =>
      publishWebhookEventToQStash({
        webhook,
        payload,
      }),
    ),
  );
};

export const publishWebhookEventToQStash = async ({
  webhook,
  payload,
}: {
  webhook: Pick<Webhook, "id" | "url" | "secret">;
  payload: z.infer<typeof webhookPayloadSchema>;
}) => {
  const callbackUrl = `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback?webhookId=${webhook.id}`;
  const signature = await createWebhookSignature(webhook.secret, payload);

  const response = await qstash.publishJSON({
    url: webhook.url,
    body: payload,
    headers: {
      "Dub-Signature": signature,
    },
    callback: callbackUrl,
    failureCallback: callbackUrl,
  });

  if (!response.messageId) {
    console.error("Failed to publish webhook event to QStash", response);
  }
};
