import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { LinkSchema } from "../zod/schemas/links";
import { createWebhookSignature } from "./utils";

interface SendToWebhookArgs {
  webhookUrl?: string;
  webhook?: Webhook;
  data: any;
}

// Publish webhook event to the webhook endpoint
export const sendToWebhook = async ({
  webhookUrl,
  webhook,
  data,
}: SendToWebhookArgs) => {
  const url = webhookUrl || webhook?.url;
  const secret = webhook?.secret || ""; // TODO: A signature is must

  if (!url) {
    console.error("No webhook URL provided. Skipping webhook event.");
    return;
  }

  const callbackUrl = `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`;
  const signature = createWebhookSignature(secret, data);

  const response = await qstash.publishJSON({
    url,
    body: {
      data,
    },
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

// Transform payload to match the webhook event schema
export const transformPayload = (payload: any, event: WebhookTrigger) => {
  if (event === "link.created") {
    return LinkSchema.parse(payload);
  }

  if (event === "link.clicked") {
    return clickEventSchemaTB.parse(payload);
  }
};
