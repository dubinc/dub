import { linkCache } from "@/lib/api/links/cache";
import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";
import { webhookCache } from "@/lib/webhook/cache";
import { WEBHOOK_ID_PREFIX } from "@/lib/webhook/constants";
import {
  identifyWebhookReceiver,
  isLinkLevelWebhook,
} from "@/lib/webhook/utils";
import { Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { WebhookTrigger } from "../types";
import { createWebhookSecret } from "./secret";

// TODO (Kiran): move the methods to individual files

export async function addWebhook({
  name,
  url,
  secret,
  triggers,
  workspace,
  linkIds,
}: {
  name: string;
  url: string;
  secret?: string;
  triggers: WebhookTrigger[];
  workspace: Pick<Project, "id">;
  linkIds?: string[];
}) {
  const webhook = await prisma.webhook.create({
    data: {
      id: createId({ prefix: WEBHOOK_ID_PREFIX }),
      name,
      url,
      triggers,
      projectId: workspace.id,
      receiver: identifyWebhookReceiver(url),
      secret: secret || createWebhookSecret(),
      links: {
        ...(linkIds &&
          linkIds.length > 0 && {
            create: linkIds.map((linkId) => ({
              linkId,
            })),
          }),
      },
    },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      triggers: true,
      links: true,
      disabledAt: true,
    },
  });

  await prisma.project.update({
    where: {
      id: workspace.id,
    },
    data: {
      webhookEnabled: true,
    },
  });

  waitUntil(
    (async () => {
      const links = await prisma.link.findMany({
        where: {
          id: { in: linkIds },
          projectId: workspace.id,
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

      Promise.all([
        ...(links && links.length > 0
          ? [linkCache.mset(formatedLinks), []]
          : []),

        ...(isLinkLevelWebhook(webhook) ? [webhookCache.set(webhook)] : []),
      ]);
    })(),
  );

  return webhook;
}

export const updateWebhookStatusForWorkspace = async ({
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
