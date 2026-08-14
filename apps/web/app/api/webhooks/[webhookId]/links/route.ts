import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// TODO: remove once we move link.clicked webhook to workspace
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    const webhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
    });

    const links = await prisma.linkWebhook.findMany({
      where: {
        webhookId: webhook.id,
      },
      select: {
        linkId: true,
      },
      take: 1000,
    });

    return NextResponse.json(links.map((link) => link.linkId));
  },
  {
    requiredPermissions: ["webhooks.read"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
