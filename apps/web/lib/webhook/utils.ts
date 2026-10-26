import { WebhookReceiver } from "@prisma/client";
import { WEBHOOK_TRIGGERS } from "./constants";
import type { WebhookTrigger } from "./types";

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

/**
 * Returns the webhook events a workspace can subscribe to in the webhook
 * picker, in display order.
 *
 * When `supportedTriggers` is passed (integrations like Zapier or Slack),
 * keeps only the events that integration supports.
 */
export function getAvailableWebhookTriggers({
  supportedTriggers,
}: {
  supportedTriggers?: readonly WebhookTrigger[];
} = {}): WebhookTrigger[] {
  return supportedTriggers
    ? WEBHOOK_TRIGGERS.filter((trigger) => supportedTriggers.includes(trigger))
    : [...WEBHOOK_TRIGGERS];
}
