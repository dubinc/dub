import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "./constants";
import type { WebhookTrigger } from "./types";

export const REDIS_KEY = "webhookClickWorkspaces";
const TMP_REDIS_KEY = `${REDIS_KEY}:tmp`;

class ClickWebhookWorkspaces {
  async add(workspaceId: string) {
    return await redis.sadd(REDIS_KEY, workspaceId);
  }

  async remove(workspaceId: string) {
    return await redis.srem(REDIS_KEY, workspaceId);
  }

  async has(workspaceId: string) {
    return await redis.sismember(REDIS_KEY, workspaceId);
  }
}

// Rebuild the Redis set of workspaces with active link.clicked webhooks.
export const rebuildClickWebhookWorkspaces = async () => {
  const webhooks = await prisma.webhook.findMany({
    where: {
      disabledAt: null,
      triggers: {
        array_contains: [LINK_CLICK_WEBHOOK_TRIGGER],
      },
      project: {
        plan: {
          notIn: ["free", "pro"],
        },
      },
    },
    select: {
      projectId: true,
    },
    distinct: ["projectId"],
  });

  const workspaceIds = webhooks.map((webhook) => webhook.projectId);

  if (workspaceIds.length === 0) {
    await redis.del(REDIS_KEY);
    return 0;
  }

  await redis.del(TMP_REDIS_KEY);
  await redis.sadd(TMP_REDIS_KEY, ...(workspaceIds as [string, ...string[]]));
  await redis.rename(TMP_REDIS_KEY, REDIS_KEY);

  return workspaceIds.length;
};

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
