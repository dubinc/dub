import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_WEBHOOK_FOLDERS } from "@/lib/webhook/constants";
import { NextResponse } from "next/server";

// GET /api/webhooks/[webhookId]/folders
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    const webhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    const folders = await prisma.folderWebhook.findMany({
      where: {
        webhookId: webhook.id,
      },
      select: {
        folderId: true,
      },
      take: MAX_WEBHOOK_FOLDERS,
    });

    return NextResponse.json(folders.map(({ folderId }) => folderId));
  },
  {
    requiredPermissions: ["webhooks.read"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
