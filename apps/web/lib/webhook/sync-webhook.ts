import { prisma } from "@/lib/prisma";
import { clickWebhookWorkspaces } from "./click-webhook-workspaces";
import { LINK_CLICK_WEBHOOK_TRIGGER, WebhookTrigger } from "./constants";

// Synchronize the workspace's webhook status with its active webhooks.
export const syncWorkspaceWebhookStatus = async (workspaceId: string) => {
  const activeWebhooks = await prisma.webhook.findMany({
    where: {
      projectId: workspaceId,
      disabledAt: null,
    },
    select: {
      triggers: true,
    },
  });

  await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      webhookEnabled: activeWebhooks.length > 0,
    },
  });

  const linkClickWebhooks = activeWebhooks.filter((webhook) =>
    (webhook.triggers as WebhookTrigger[])?.includes(
      LINK_CLICK_WEBHOOK_TRIGGER,
    ),
  );

  if (linkClickWebhooks.length > 0) {
    await clickWebhookWorkspaces.set(workspaceId);
  } else {
    await clickWebhookWorkspaces.remove(workspaceId);
  }
};
