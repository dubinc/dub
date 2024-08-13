import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, nanoid } from "@dub/utils";
import { Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { createWebhookSignature } from "./utils";

interface SendToWebhookArgs {
  webhookUrl?: string;
  webhook?: Webhook;
  data: any;
  trigger: WebhookTrigger;
}

// Publish webhook event to the webhook endpoint
export const sendToWebhook = async ({
  webhookUrl,
  webhook,
  data,
  trigger,
}: SendToWebhookArgs) => {
  const url = webhookUrl || webhook?.url;
  const secret = webhook?.secret || "random-secret";

  if (!url) {
    console.error("No webhook URL provided. Skipping webhook event.");
    return;
  }

  const payload = webhookPayloadSchema.parse({
    event: trigger,
    webhookId: nanoid(16),
    createdAt: new Date().toISOString(),
    data,
  });

  console.log("Webhook payload", payload);

  const callbackUrl = `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`;
  const signature = await createWebhookSignature(secret, payload);

  const response = await qstash.publishJSON({
    url,
    body: payload,
    headers: {
      "Dub-Signature": signature,
    },
    callback: callbackUrl,
    failureCallback: callbackUrl,
  });

  if (response.messageId) {
    console.log(
      `Webhook event sent to ${url} with messageId: ${response.messageId}`,
    );
  }
};
