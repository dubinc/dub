import { prismaEdge } from "../prisma/edge";
import { WebhookTrigger } from "../types";
import { sendWebhooks } from "./qstash";
import { LeadEventDataProps, SaleEventDataProps } from "./types";

export const sendLinkWebhookOnEdge = async ({
  trigger,
  linkId,
  data,
}: {
  trigger: WebhookTrigger;
  linkId: string;
  data: LeadEventDataProps | SaleEventDataProps;
}) => {
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

  return sendWebhooks({
    trigger,
    webhooks: linkWebhooks.map(({ webhook }) => webhook),
    data,
  });
};
