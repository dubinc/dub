import { prisma } from "@dub/prisma";
import { webhookCache } from "./cache";

// Based on the webhook count, we toggle the webhook status for the workspace
export const toggleWebhooksForWorkspace = async ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  const activeWebhooksCount = await prisma.webhook.count({
    where: {
      projectId: workspaceId,
      disabledAt: null,
    },
  });

  await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      webhookEnabled: activeWebhooksCount > 0,
    },
  });
};

// Propagate webhook trigger changes to the webhook cache
export const propagateWebhookTriggerChanges = async ({
  webhookIds,
}: {
  webhookIds: string[] | undefined;
}) => {
  if (!webhookIds) {
    return;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      id: {
        in: webhookIds,
      },
    },
    select: {
      id: true,
      triggers: true,
      url: true,
      secret: true,
      disabledAt: true,
      _count: {
        select: {
          links: true,
        },
      },
    },
  });

  // Make the webhook a link-level
  // If it has links + doesn't have link.clicked trigger
  const linkLevelWebhooks = webhooks.filter(
    (webhook) =>
      webhook._count.links > 0 &&
      !(webhook.triggers as string[])?.includes("link.clicked"),
  );

  // Add link.clicked trigger to the webhook and cache it
  if (linkLevelWebhooks.length > 0) {
    const toUpdate = linkLevelWebhooks.map((webhook) => ({
      ...webhook,
      triggers: [...(webhook.triggers as string[]), "link.clicked"],
    }));

    await Promise.all([
      ...linkLevelWebhooks.map((webhook) =>
        prisma.webhook.update({
          where: {
            id: webhook.id,
          },
          data: {
            triggers: [...(webhook.triggers as string[]), "link.clicked"],
          },
        }),
      ),

      webhookCache.mset(toUpdate),
    ]);
  }

  // Check if there are any webhooks downgraded to workspace level
  // If so, remove link.clicked trigger and remove it from the cache
  const workspaceLevelWebhooks = webhooks.filter(
    (webhook) =>
      webhook._count.links === 0 &&
      (webhook.triggers as string[])?.includes("link.clicked"),
  );

  if (workspaceLevelWebhooks.length > 0) {
    await Promise.all([
      ...workspaceLevelWebhooks.map((webhook) =>
        prisma.webhook.update({
          where: {
            id: webhook.id,
          },
          data: {
            triggers: (webhook.triggers as string[]) || [],
          },
        }),
      ),

      webhookCache.deleteMany(
        workspaceLevelWebhooks.map((webhook) => webhook.id),
      ),
    ]);
  }
};
