import { Webhook, WebhookReceiver } from "@dub/prisma/client";
import { LINK_LEVEL_WEBHOOK_TRIGGERS } from "./constants";

const webhookReceivers: Record<string, WebhookReceiver> = {
  "zapier.com": "zapier",
  "hooks.zapier.com": "zapier",
  "make.com": "make",
  "hooks.slack.com": "slack",
  "api.segment.io": "segment",
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
  const { hostname } = new URL(url);

  return webhookReceivers[hostname] || "user";
};
