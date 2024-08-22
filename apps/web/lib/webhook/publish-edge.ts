import { prismaEdge } from "@/lib/prisma/edge";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { sendWebhookEventToQStash } from "./qstash";

export const dispatchLinkWebhook = async ({
  workspace,
  linkId,
  event,
  data,
}: {
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  linkId: string;
  event: WebhookTrigger;
  data: any;
}) => {
  if (!workspace.webhookEnabled) {
    return;
  }

  const webhooks = await prismaEdge.webhook.findMany({
    where: {
      projectId: workspace.id,
      triggers: {
        array_contains: [event],
      },
      linkWebhooks: {
        some: {
          linkId,
        },
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

  console.log("webhooks", webhooks);

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
