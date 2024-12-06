import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@/lib/prisma";
import { webhookCache } from "@/lib/webhook/cache";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../api/errors";
import { updateWebhookStatusForWorkspace } from "./update-webhook";

export const deleteWebhook = async ({
  webhookId,
  workspaceId,
}: {
  webhookId: string;
  workspaceId: string;
}) => {
  const webhook = await prisma.webhook.findUniqueOrThrow({
    where: {
      id: webhookId,
      projectId: workspaceId,
    },
    select: {
      installationId: true,
    },
  });

  if (webhook.installationId) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "This webhook is managed by an integration, hence cannot be deleted manually.",
    });
  }

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
