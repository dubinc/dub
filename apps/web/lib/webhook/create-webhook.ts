import { createId } from "@/lib/api/create-id";
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
  excludeLinkIds,
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
        create: [
          ...(linkIds?.map((linkId) => ({
            linkId,
            enabled: true,
          })) || []),
          ...(excludeLinkIds?.map((linkId) => ({
            linkId,
            enabled: false,
          })) || []),
        ],
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
      if (isLinkLevelWebhook(webhook)) {
        await webhookCache.set(webhook);
      }
    })(),
  );

  return webhook;
}
