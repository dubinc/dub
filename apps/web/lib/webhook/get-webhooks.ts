import { prisma } from "@dub/prisma";
import { WebhookTrigger } from "../types";

export async function getWebhooks({
  workspaceId,
  triggers,
}: {
  workspaceId: string;
  triggers?: WebhookTrigger[];
}) {
  return await prisma.webhook.findMany({
    where: {
      projectId: workspaceId,
      ...(triggers
        ? {
            triggers: {
              array_contains: triggers,
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      triggers: true,
      disabledAt: true,
      links: true,
      receiver: true,
      installationId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
