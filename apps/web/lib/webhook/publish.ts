import { prisma } from "@/lib/prisma";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { sendWebhooks } from "./qstash";

// Send workspace level webhook
export const sendWorkspaceWebhook = async (
  trigger: WebhookTrigger,
  props: {
    workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
    data: any;
  },
) => {
  const { workspace, data } = props;

  if (!workspace.webhookEnabled) {
    return;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId: workspace.id,
      triggers: {
        array_contains: [trigger],
      },
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  });

  return sendWebhooks(trigger, { webhooks, data });
};

// Send link level webhook
export const sendLinkWebhook = async (
  trigger: WebhookTrigger,
  props: {
    linkId: string;
    data: any;
  },
) => {
  const { data, linkId } = props;

  const linkWebhooks = await prisma.linkWebhook.findMany({
    where: {
      linkId,
      webhook: {
        triggers: {
          array_contains: [trigger],
        },
      },
    },
    include: {
      webhook: {
        select: {
          id: true,
          url: true,
          secret: true,
        },
      },
    },
  });

  if (linkWebhooks.length === 0) {
    return;
  }

  return sendWebhooks(trigger, {
    webhooks: linkWebhooks.map(({ webhook }) => webhook),
    data,
  });
};
