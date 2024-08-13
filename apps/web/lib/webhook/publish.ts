import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { LinkSchema } from "../zod/schemas/links";

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

  if (!url) {
    console.error("No webhook URL provided. Skipping webhook event.");
    return;
  }

  // Receive webhook status from QStash at this URL
  const callbackUrl = `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`;

  const response = await qstash.publishJSON({
    url,
    body: {
      data,
    },
    headers: {
      "X-Dub-Header1": "Header Value 1",
    },
    callback: callbackUrl,
    failureCallback: callbackUrl,
  });

  console.log("Webhook response", response);
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
