import { prisma } from "@/lib/prisma";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { sendWebhookEventToQStash } from "./qstash";

interface DispatchWebhookProps {
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  data: any;
  linkId?: string;
}

export const dispatchWebhook = async (
  trigger: WebhookTrigger,
  props: DispatchWebhookProps,
) => {
  const { workspace, linkId, data } = props;

  if (!workspace.webhookEnabled) {
    return;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId: workspace.id,
      triggers: {
        array_contains: [trigger],
      },
      ...(linkId && {
        links: {
          some: {
            linkId,
          },
        },
      }),
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
        data,
        trigger,
      }),
    ),
  );
};
