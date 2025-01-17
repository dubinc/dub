import { linkCache } from "@/lib/api/links/cache";
import { createId } from "@/lib/api/utils";
import { webhookCache } from "@/lib/webhook/cache";
import { WEBHOOK_ID_PREFIX } from "@/lib/webhook/constants";
import { checkForClickTrigger } from "@/lib/webhook/utils";
import { prisma } from "@dub/prisma";
import { Project, WebhookReceiver } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { createWebhookSchema } from "../zod/schemas/webhooks";
import { createWebhookSecret } from "./secret";
import { toggleWebhooksForWorkspace } from "./update-webhook";

export async function createWebhook({
  name,
  url,
  secret,
  triggers,
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

  await toggleWebhooksForWorkspace({
    workspaceId: workspace.id,
  });

  waitUntil(
    (async () => {
      const hasClickTrigger = checkForClickTrigger(webhook);

      if (!hasClickTrigger) {
        return;
      }

      await webhookCache.set(webhook);

      // TODO:
      // Move this to a background job and process x links at a time

      const webhooks = await prisma.webhook.findMany({
        where: {
          projectId: workspace.id,
          triggers: {
            array_contains: ["link.clicked"],
          },
        },
        select: {
          id: true,
        },
      });

      if (webhooks.length === 0) {
        return;
      }

      const links = await prisma.link.findMany({
        where: {
          projectId: workspace.id,
        },
      });

      if (links.length === 0) {
        return;
      }

      const formatedLinks = links.map((link) => {
        return {
          ...link,
          webhookIds: webhooks.map((webhook) => webhook.id),
        };
      });

      await linkCache.mset(formatedLinks);
    })(),
  );

  return webhook;
}
