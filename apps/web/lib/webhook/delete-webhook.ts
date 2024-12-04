import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@/lib/prisma";
import { webhookCache } from "@/lib/webhook/cache";
import { waitUntil } from "@vercel/functions";
import { updateWebhookStatusForWorkspace } from "./update-webhook";

export const deleteWebhook = async ({
  webhookId,
  workspaceId,
}: {
  webhookId: string;
  workspaceId: string;
}) => {
  const linkWebhooks = await prisma.linkWebhook.findMany({
    where: {
      webhookId,
    },
    select: {
      linkId: true,
    },
  });

  await prisma.webhook.delete({
    where: {
      id: webhookId,
      projectId: workspaceId,
    },
  });

  waitUntil(
    (async () => {
      const links = await prisma.link.findMany({
        where: {
          id: { in: linkWebhooks.map(({ linkId }) => linkId) },
        },
        include: {
          webhooks: {
            select: {
              webhookId: true,
            },
          },
        },
      });

      const formatedLinks = links.map((link) => {
        return {
          ...link,
          webhookIds: link.webhooks.map((webhook) => webhook.webhookId),
        };
      });

      await Promise.all([
        updateWebhookStatusForWorkspace({
          workspaceId,
        }),

        linkCache.mset(formatedLinks),

        webhookCache.delete(webhookId),
      ]);
    })(),
  );
};
