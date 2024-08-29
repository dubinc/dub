import type { Webhook } from "@prisma/client";
import { LINK_LEVEL_WEBHOOK_TRIGGERS } from "./constants";

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
