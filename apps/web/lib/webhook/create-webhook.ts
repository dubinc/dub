import { createId } from "@/lib/api/create-id";
import { linkCache } from "@/lib/api/links/cache";
import { webhookCache } from "@/lib/webhook/cache";
import { WEBHOOK_ID_PREFIX } from "@/lib/webhook/constants";
import { isLinkLevelWebhook } from "@/lib/webhook/utils";
import { prisma } from "@dub/prisma";
import { Project, WebhookReceiver } from "@dub/prisma/client";
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
  workspace,
  receiver,
  installationId,
}: z.infer<typeof createWebhookSchema> & {
  workspace: Pick<Project, "id" | "plan">;
  receiver: WebhookReceiver;
  installationId?: string;
}) {
  // Webhooks are only supported on Business plans and above
  if (["free", "pro"].includes(workspace.plan)) {
    return;
  }

  const webhook = await prisma.webhook.create({
    data: {
      id: createId({ prefix: WEBHOOK_ID_PREFIX }),
      name,
      url,
      triggers,
      receiver,
      installationId,
      projectId: workspace.id,
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
