import { prisma } from "@/lib/prisma";
import { webhookCache } from "./cache";

// Synchronize the workspace's webhook status with its active webhooks.
export const syncWorkspaceWebhookStatus = async ({
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
      linkScope: true,
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

  // Promote to "links" scope: a webhook that now has links but isn't a link.clicked webhook yet
  const promotedWebhooks = webhooks.filter(
    (webhook) =>
      webhook._count.links > 0 &&
      !(webhook.triggers as string[])?.includes("link.clicked"),
  );

  // Add the link.clicked trigger + links scope to the webhook and cache it
  if (promotedWebhooks.length > 0) {
    const toUpdate = promotedWebhooks.map((webhook) => ({
      ...webhook,
      triggers: [...(webhook.triggers as string[]), "link.clicked"],
    }));

    await Promise.all([
      ...promotedWebhooks.map((webhook) =>
        prisma.webhook.update({
          where: {
            id: webhook.id,
          },
          data: {
            triggers: [...(webhook.triggers as string[]), "link.clicked"],
            linkScope: "links",
          },
        }),
      ),

      webhookCache.mset(toUpdate),
    ]);
  }

  // Demote to workspace level: a "links" scope webhook that no longer has any links.
  // "all" / "folders" scope webhooks intentionally have no links, so they're never demoted.
  const demotedWebhooks = webhooks.filter(
    (webhook) =>
      webhook._count.links === 0 &&
      webhook.linkScope !== "all" &&
      webhook.linkScope !== "folders" &&
      (webhook.triggers as string[])?.includes("link.clicked"),
  );

  if (demotedWebhooks.length > 0) {
    await Promise.all([
      ...demotedWebhooks.map((webhook) =>
        prisma.webhook.update({
          where: {
            id: webhook.id,
          },
          data: {
            triggers: (webhook.triggers as string[]).filter(
              (trigger) => trigger !== "link.clicked",
            ),
            linkScope: null,
          },
        }),
      ),

      webhookCache.deleteMany(demotedWebhooks.map((webhook) => webhook.id)),
    ]);
  }
};
