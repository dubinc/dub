import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

type QueueEmailOptions = {
  event: "new-sale-created";
  payload: {
    saleId: string;
  };
};

export const queueEmail = async ({ event, payload }: QueueEmailOptions) => {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/email`,
    body: {
      event,
      payload,
    },
  });
};
