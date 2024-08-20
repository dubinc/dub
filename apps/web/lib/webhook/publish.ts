import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Webhook } from "@prisma/client";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { createWebhookSignature } from "./signature";

export const dispatchWebhookEvents = async ({
  workspace,
  event,
  data,
}: {
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  event: WebhookTrigger;
  data: any;
}) => {
  if (!workspace.webhookEnabled) {
    return;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId: workspace.id,
      triggers: {
        array_contains: [event],
      },
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  await Promise.all(
    webhooks.map((webhook) =>
      sendWebhookEventToQStash({
        webhook,
        event,
        data,
      }),
    ),
  );
};

const sendWebhookEventToQStash = async ({
  webhook,
  event,
  data,
}: {
  webhook: Pick<Webhook, "id" | "url" | "secret">;
  event: WebhookTrigger;
  data: any;
}) => {
  const payload = webhookPayloadSchema.parse({
    event,
    data,
    webhookId: webhook.id,
    createdAt: new Date().toISOString(),
  });

  const callbackUrl = `${APP_DOMAIN_WITH_NGROK}/api/webhooks/callback`;
  const signature = await createWebhookSignature(webhook.secret, payload);

  const response = await qstash.publishJSON({
    url: webhook.url,
    body: payload,
    headers: {
      "Dub-Signature": signature,
    },
    callback: callbackUrl,
    failureCallback: callbackUrl,
  });

  if (response.messageId) {
    console.log(
      `Webhook event published to QStash with message ID: ${response.messageId}`,
    );
  }
};
