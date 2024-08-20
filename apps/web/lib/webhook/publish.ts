import { prisma } from "@/lib/prisma";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { sendWebhookEventToQStash } from "./qstash";

export const dispatchWebhookEvents = async ({
  workspace,
  event,
  data,
}: {
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  event: WebhookTrigger;
  data: any;
}) => {
  if (!workspace.webhookEnabled) {
    return;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId: workspace.id,
      triggers: {
        array_contains: [event],
      },
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  await Promise.all(
    webhooks.map((webhook) =>
      sendWebhookEventToQStash({
        webhook,
        event,
        data,
      }),
    ),
  );
};
