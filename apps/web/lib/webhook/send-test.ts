import { Webhook } from "@prisma/client";
import { WebhookTrigger } from "../types";
import { getWebhookEventSample } from "./samples";

const sendTestWebhook = async ({
  webhook,
  event,
}: {
  webhook: Pick<Webhook, "url" | "secret">;
  event: WebhookTrigger;
}) => {
  const payload = getWebhookEventSample(event);

  // Send webhook
  const response = await fetch(webhook.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": webhook.secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to send webhook: ${response.statusText}`);
  }

  return response.json();
};
