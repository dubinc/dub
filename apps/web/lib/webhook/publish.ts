import { prisma } from "@/lib/prisma";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { sendWebhooks } from "./qstash";
import {
  ClickEventDataProps,
  LeadEventDataProps,
  LinkEventDataProps,
  SaleEventDataProps,
} from "./types";

// Send workspace level webhook
export const sendWorkspaceWebhook = async ({
  trigger,
  workspace,
  data,
}: {
  trigger: WebhookTrigger;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  data: LinkEventDataProps;
}) => {
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

  return sendWebhooks({ trigger, webhooks, data });
};

// Send link level webhook
export const sendLinkWebhook = async ({
  trigger,
  linkId,
  data,
}: {
  trigger: WebhookTrigger;
  linkId: string;
  data: ClickEventDataProps | LeadEventDataProps | SaleEventDataProps;
}) => {
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

  return sendWebhooks({
    trigger,
    webhooks: linkWebhooks.map(({ webhook }) => webhook),
    data,
  });
};
