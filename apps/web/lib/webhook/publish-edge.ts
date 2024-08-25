import { prismaEdge } from "../prisma/edge";
import { WebhookTrigger } from "../types";
import { sendWebhooks } from "./qstash";

export const sendLinkWebhookOnEdge = async (
  trigger: WebhookTrigger,
  props: {
    linkId: string;
    data: any;
  },
) => {
  const { data, linkId } = props;

  const linkWebhooks = await prismaEdge.linkWebhook.findMany({
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

  const webhooks = linkWebhooks.map(({ webhook }) => webhook);

  return sendWebhooks(trigger, { webhooks, data });
};
