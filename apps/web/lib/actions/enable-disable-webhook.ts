"use server";

import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { webhookCache } from "../webhook/cache";
import { toggleWebhooksForWorkspace } from "../webhook/update-webhook";
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

    if (["free", "pro"].includes(workspace.plan)) {
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
          toggleWebhooksForWorkspace({
            workspaceId: workspace.id,
          }),

          webhookCache.set(updatedWebhook),
        ]);
      })(),
    );

    return {
      disabledAt,
    };
  });
