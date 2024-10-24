"use server";

import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { updateWebhookStatusForWorkspace } from "../webhook/api";
import { webhookCache } from "../webhook/cache";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  webhookId: z.string(),
});

// Enable or disable a webhook
export const enableOrDisableWebhook = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { webhookId } = parsedInput;

    const canAccessWebhook = !["free", "pro"].includes(workspace.plan);

    if (!canAccessWebhook) {
      throw new Error("You must upgrade your plan to enable webhooks.");
    }

    const webhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      select: {
        disabledAt: true,
      },
    });

    const disabledAt = webhook.disabledAt ? null : new Date();

    const updatedWebhook = await prisma.webhook.update({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      data: {
        disabledAt,
      },
    });

    waitUntil(
      (async () => {
        await Promise.all([
          updateWebhookStatusForWorkspace({ workspace }),

          webhookCache.set(updatedWebhook),
        ]);
      })(),
    );

    return {
      disabledAt,
    };
  });
