"use server";

import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { syncWorkspaceWebhookStatus } from "../webhook/click-webhook-workspaces";
import { authActionClient } from "./safe-action";
import { throwIfNoPermission } from "./throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  webhookId: z.string(),
});

// Enable or disable a webhook
export const enableOrDisableWebhook = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { webhookId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["webhooks.write"],
    });

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

    await prisma.webhook.update({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      data: {
        disabledAt,
      },
    });

    waitUntil(syncWorkspaceWebhookStatus(workspace.id));

    return {
      disabledAt,
    };
  });
