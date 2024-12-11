import { prisma } from "@dub/prisma";

export const updateWebhookStatusForWorkspace = async ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  const activeWebhooksCount = await prisma.webhook.count({
    where: {
      projectId: workspaceId,
      disabledAt: null,
    },
  });

  await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      webhookEnabled: activeWebhooksCount > 0,
    },
  });
};
