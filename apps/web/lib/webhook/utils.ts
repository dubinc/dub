import type { Webhook, WebhookReceiver } from "@prisma/client";
import { LINK_LEVEL_WEBHOOK_TRIGGERS } from "./constants";

const webhookReceivers: Record<string, WebhookReceiver> = {
  "hooks.zapier.com": "zapier",
  "make.com": "make",
  "hooks.slack.com": "slack",
};

export const isLinkLevelWebhook = (webhook: Pick<Webhook, "triggers">) => {
  if (!webhook.triggers) {
    return false;
  }

  const triggers =
    webhook.triggers as (typeof LINK_LEVEL_WEBHOOK_TRIGGERS)[number][];

  return triggers.some((trigger) =>
    LINK_LEVEL_WEBHOOK_TRIGGERS.includes(trigger),
  );
};

export const identifyWebhookReceiver = (url: string): WebhookReceiver => {
  const urlObject = new URL(url);
  const domain = urlObject.hostname;

  return webhookReceivers[domain] || "user";
};
