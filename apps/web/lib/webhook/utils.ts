import { Webhook, WebhookReceiver } from "@dub/prisma/client";
import { WebhookTrigger } from "../types";

const webhookReceivers: Record<string, WebhookReceiver> = {
  "zapier.com": "zapier",
  "hooks.zapier.com": "zapier",
  "make.com": "make",
  "hooks.slack.com": "slack",
  "api.segment.io": "segment",
};

export const identifyWebhookReceiver = (url: string): WebhookReceiver => {
  const { hostname } = new URL(url);

  return webhookReceivers[hostname] || "user";
};

export const checkForClickTrigger = (webhook: Pick<Webhook, "triggers">) => {
  const triggers = webhook.triggers as WebhookTrigger[];

  if (!triggers) {
    return false;
  }

  return triggers.some((trigger) => trigger.includes("link.clicked"));
};
