import { WebhookCacheProps, WebhookTrigger } from "../types";
import { prepareWebhookPayload } from "./prepare-payload";
import { sendWebhookEventToQStash } from "./qstash";

interface SendWebhookProps {
  webhooks: WebhookCacheProps[];
  data: any;
}

export const sendWebhook = async (
  trigger: WebhookTrigger,
  { webhooks, data }: SendWebhookProps,
) => {
  // Filter webhooks that match the trigger
  const matchedWebhooks = webhooks.filter((webhook) => {
    return webhook.triggers && (webhook.triggers as string[]).includes(trigger);
  });

  if (matchedWebhooks.length === 0) {
    return;
  }

  // Final payload to be sent to Webhook
  const payload = prepareWebhookPayload(trigger, data);

  await Promise.all(
    matchedWebhooks.map((webhook) =>
      sendWebhookEventToQStash({
        webhook,
        payload,
      }),
    ),
  );
};