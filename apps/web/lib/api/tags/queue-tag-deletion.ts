import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function queueLinkTagDeletion({
  tagId,
  delay,
}: {
  tagId: string;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/tags/delete-link-tag`,
    ...(delay && { delay }),
    body: {
      id: tagId,
    },
  });
}

export async function queuePartnerTagDeletion({
  partnerTagId,
  delay,
}: {
  partnerTagId: string;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/tags/delete-partner-tag`,
    ...(delay && { delay }),
    body: {
      id: partnerTagId,
    },
  });
}
