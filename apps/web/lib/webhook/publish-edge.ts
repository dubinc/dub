import { prismaEdge } from "@dub/prisma/edge";
import { WebhookTrigger, WorkspaceProps } from "../types";
import { sendWebhooks } from "./qstash";
import { LeadEventDataProps, SaleEventDataProps } from "./types";

// Send workspace level webhook
export const sendWorkspaceWebhookOnEdge = async ({
  trigger,
  workspace,
  data,
}: {
  trigger: WebhookTrigger;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  data: LeadEventDataProps | SaleEventDataProps;
}) => {
  if (!workspace.webhookEnabled) {
    return;
  }

  const webhooks = await prismaEdge.webhook.findMany({
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
