import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { createWebhookSignature } from "./signature";

interface SendToWebhookArgs {
  webhook: Pick<Webhook, "id" | "url" | "secret">;
  event: WebhookTrigger;
  data: any;
}

export const sendToWebhook = async ({
  webhook,
  event,
  data,
}: SendToWebhookArgs) => {
  const payload = webhookPayloadSchema.parse({
    event,
    data,
    webhookId: webhook.id,
    createdAt: new Date().toISOString(),
  });

  const callbackUrl = `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`;
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

  if (response.messageId) {
    console.log(
      `Webhook event published to QStash with message ID: ${response.messageId}`,
    );
  }
};
