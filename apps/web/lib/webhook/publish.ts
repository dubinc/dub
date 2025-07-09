import { prisma } from "@dub/prisma";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { sendWebhooks } from "./qstash";
import {
  CommissionEventDataProps,
  LeadEventDataProps,
  LinkEventDataProps,
  PartnerEventDataProps,
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
  data:
    | LinkEventDataProps
    | LeadEventDataProps
    | SaleEventDataProps
    | PartnerEventDataProps
    | CommissionEventDataProps;
}) => {
  if (!workspace.webhookEnabled) {
    return;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId: workspace.id,
      disabledAt: null,
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
