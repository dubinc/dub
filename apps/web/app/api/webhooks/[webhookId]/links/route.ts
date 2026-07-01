import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// TODO: remove once we move link.clicked webhook to workspace
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { webhookId } = params;

  const webhook = await prisma.webhook.findUniqueOrThrow({
    where: {
      id: webhookId,
      projectId: workspace.id,
    },
  });

  const links = await prisma.link.findMany({
    where: {
      webhooks: {
        some: {
          webhookId: webhook.id,
        },
      },
    },
    take: 1000,
  });

  return NextResponse.json(links.map((link) => link.id));
});
