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

// periodically remove redundant LinkWebhook entries for webhooks that are not scoped to links (folders, workspace)
// we do this in case clients are still passing webhookIds when creating links, which will create LinkWebhook entries
export const cleanupRedundantLinkWebhookEntries = async () => {
  const nonLinkScopeWebhooks = await prisma.webhook.findMany({
    where: {
      triggers: {
        array_contains: [LINK_CLICK_WEBHOOK_TRIGGER],
      },
      linkScope: {
        not: "links",
      },
      links: {
        some: {},
      },
    },
  });

  let deletedCount = 0;
  while (true) {
    const linksToDelete = await prisma.linkWebhook.findMany({
      where: {
        webhookId: {
          in: nonLinkScopeWebhooks.map((webhook) => webhook.id),
        },
      },
      take: 250,
    });
    const deleted = await prisma.linkWebhook.deleteMany({
      where: {
        id: {
          in: linksToDelete.map((link) => link.id),
        },
      },
    });
    deletedCount += deleted.count;
    if (deleted.count === 0) {
      console.log("No more redundant LinkWebhook entries to delete");
      break;
    }
    console.log(`Deleted ${deleted.count} redundant LinkWebhook entries`);
  }
  return deletedCount;
};
