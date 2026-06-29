import { Webhook, WebhookReceiver } from "@prisma/client";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "./constants";
import type { WebhookTrigger } from "./types";

const webhookReceivers: Record<string, WebhookReceiver> = {
  "zapier.com": "zapier",
  "hooks.zapier.com": "zapier",
  "make.com": "make",
  "hooks.slack.com": "slack",
  "api.segment.io": "segment",
};

export const hasLinkClickTrigger = (webhook: Pick<Webhook, "triggers">) => {
  if (!webhook.triggers) {
    return false;
  }

  const triggers = webhook.triggers as WebhookTrigger[];

  return triggers.includes(LINK_CLICK_WEBHOOK_TRIGGER);
};

export const identifyWebhookReceiver = (url: string): WebhookReceiver => {
  const { hostname } = new URL(url);

  return webhookReceivers[hostname] || "user";
};
