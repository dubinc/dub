import { Webhook } from "@prisma/client";

interface TransformWebhookProps
  extends Pick<Webhook, "id" | "name" | "url" | "secret" | "triggers"> {
  linkWebhooks: { linkId: string }[];
}

export const transformWebhook = (webhook: TransformWebhookProps) => {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: webhook.secret,
    triggers: webhook.triggers,
    linkIds: webhook.linkWebhooks.map((linkWebhook) => linkWebhook.linkId),
  };
};
