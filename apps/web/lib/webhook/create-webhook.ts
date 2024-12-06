import { linkCache } from "@/lib/api/links/cache";
import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";
import { webhookCache } from "@/lib/webhook/cache";
import { WEBHOOK_ID_PREFIX } from "@/lib/webhook/constants";
import { isLinkLevelWebhook } from "@/lib/webhook/utils";
import { WebhookReceiver } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { createWebhookSchema } from "../zod/schemas/webhooks";
import { createWebhookSecret } from "./secret";

export async function createWebhook({
  name,
  url,
  secret,
  triggers,
  linkIds,
  workspaceId,
  receiver,
  installationId,
}: z.infer<typeof createWebhookSchema> & {
  workspaceId: string;
  receiver?: WebhookReceiver;
  installationId?: string;
}) {
  const webhook = await prisma.webhook.create({
    data: {
      id: createId({ prefix: WEBHOOK_ID_PREFIX }),
      name,
      url,
      triggers,
      receiver,
      installationId,
      projectId: workspaceId,
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
      installationId: true,
    },
  });

  await prisma.project.update({
    where: {
      id: workspaceId,
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
          projectId: workspaceId,
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
