import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { WEBHOOK_ID_PREFIX } from "@/lib/webhook/constants";
import { Project, WebhookReceiver } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { createWebhookSchema } from "../zod/schemas/webhooks";
import { createWebhookSecret } from "./secret";

export async function createWebhook({
  name,
  url,
  secret,
  triggers,
  scope,
  linkIds,
  folderIds,
  workspace,
  receiver,
  installationId,
}: z.infer<typeof createWebhookSchema> & {
  workspace: Pick<Project, "id" | "plan">;
  receiver: WebhookReceiver;
  installationId?: string;
  secret?: string;
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
      scope,
    },
  });

  if (scope === "links" && linkIds && linkIds.length > 0) {
    await prisma.linkWebhook.createMany({
      data: linkIds.map((linkId) => ({
        linkId,
        webhookId: webhook.id,
      })),
    });
  }

  if (scope === "folders" && folderIds && folderIds.length > 0) {
    await prisma.folderWebhook.createMany({
      data: folderIds.map((folderId) => ({
        folderId,
        webhookId: webhook.id,
      })),
    });
  }

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
      //
    })(),
  );

  return webhook;
}
