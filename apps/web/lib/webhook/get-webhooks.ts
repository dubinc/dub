import { prisma } from "@dub/prisma";
import { WebhookTrigger } from "../types";

interface GetWebhooksProps {
  workspaceId: string;
  triggers?: WebhookTrigger[];
  disabled?: boolean;
}

export async function getWebhooks({
  workspaceId,
  triggers,
  disabled,
}: GetWebhooksProps) {
  return await prisma.webhook.findMany({
    where: {
      projectId: workspaceId,
      ...(triggers ? { triggers: { array_contains: triggers } } : {}),
      ...(disabled !== undefined
        ? { disabledAt: disabled ? { not: null } : null }
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
