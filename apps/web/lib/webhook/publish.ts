import { prisma } from "@/lib/prisma";
import { Webhook } from "@prisma/client";
import { WorkspaceProps } from "../types";
import { sendWebhooks } from "./qstash";
import type { WebhookEventPayload, WebhookTrigger } from "./types";

// Send workspace level webhook
export const sendWorkspaceWebhook = async ({
  trigger,
  workspace,
  data,
  webhooks,
}: {
  trigger: WebhookTrigger;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  data: WebhookEventPayload;
  webhooks?: Pick<Webhook, "id" | "url" | "secret">[]; // optionally accept webhooks when sending bulk webhooks (eg: payout.confirmed)
}) => {
  if (!workspace.webhookEnabled) {
    return;
  }

  if (webhooks === undefined) {
    webhooks = await prisma.webhook.findMany({
      where: {
        projectId: workspace.id,
        disabledAt: null,
        triggers: {
          array_contains: [trigger],
        },
      },
      select: {
        id: true,
        url: true,
        secret: true,
      },
    });
  }

  return sendWebhooks({
    trigger,
    webhooks,
    data,
  });
};
