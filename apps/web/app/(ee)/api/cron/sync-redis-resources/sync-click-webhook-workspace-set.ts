import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY } from "@/lib/webhook/click-webhook-workspaces";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "@/lib/webhook/constants";

const TMP_REDIS_KEY = `${LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY}:tmp`;

// Rebuild the Redis set of workspaces with active link.clicked webhooks
export const syncClickWebhookWorkspaceSet = async () => {
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
    await redis.del(LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY);
    return 0;
  }

  await redis.del(TMP_REDIS_KEY);
  await redis.sadd(TMP_REDIS_KEY, ...(workspaceIds as [string, ...string[]]));
  await redis.rename(TMP_REDIS_KEY, LINK_CLICKED_WEBHOOK_WORKSPACES_REDIS_KEY);

  return workspaceIds.length;
};
