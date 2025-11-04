import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function queueDomainUpdate({
  oldDomain,
  newDomain,
  delay,
}: {
  oldDomain: string;
  newDomain: string;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/update`,
    ...(delay && { delay }),
    body: {
      oldDomain,
      newDomain,
    },
  });
}

export async function queueDomainDeletion({
  domain,
  delay,
}: {
  domain: string;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/delete`,
    ...(delay && { delay }),
    body: {
      domain,
    },
  });
}
