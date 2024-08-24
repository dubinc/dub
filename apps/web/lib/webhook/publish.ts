import { prisma } from "@/lib/prisma";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { prepareWebhookPayload } from "./prepare-payload";
import { sendWebhookEventToQStash } from "./qstash";

interface SendWebhookProps {
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  data: any;
  linkId?: string;
}

export const sendWebhook = async (
  trigger: WebhookTrigger,
  props: SendWebhookProps,
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

  // Final payload to be sent to Webhook
  const payload = prepareWebhookPayload(trigger, data);

  await Promise.all(
    webhooks.map((webhook) =>
      sendWebhookEventToQStash({
        webhook,
        payload,
      }),
    ),
  );
};
