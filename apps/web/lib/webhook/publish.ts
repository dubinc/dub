import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { WebhookTrigger } from "../types";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { LinkSchema } from "../zod/schemas/links";

export const publishWebhookEvent = async () => {
  const payload = transformPayload({}, "link.created");

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/webhooks/publish`,
    body: {
      //
    },
  });
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
