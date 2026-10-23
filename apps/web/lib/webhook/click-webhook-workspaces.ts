import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "./constants";
import type { WebhookTrigger } from "./types";

export const LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY =
  "linkClickedWebhookWorkspaces";

class ClickWebhookWorkspaces {
  async add(workspaceId: string) {
    return await redis.sadd(
      LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY,
      workspaceId,
    );
  }

  async remove(workspaceId: string) {
    return await redis.srem(
      LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY,
      workspaceId,
    );
  }

  async has(workspaceId: string) {
    return await redis.sismember(
      LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY,
      workspaceId,
    );
  }
}

export const clickWebhookWorkspaces = new ClickWebhookWorkspaces();

// Synchronize the workspace's webhook status with its active webhooks.
export const syncWorkspaceWebhookStatus = async (workspaceId: string) => {
  const activeWebhooks = await prisma.webhook.findMany({
    where: {
      projectId: workspaceId,
      disabledAt: null,
      project: {
        plan: {
          notIn: ["free", "pro"],
        },
      },
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
    await clickWebhookWorkspaces.add(workspaceId);
  } else {
    await clickWebhookWorkspaces.remove(workspaceId);
  }
};
