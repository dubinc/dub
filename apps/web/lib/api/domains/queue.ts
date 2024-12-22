import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function queueDomainUpdate({
  workspaceId,
  oldDomain,
  newDomain,
  page,
  delay,
}: {
  workspaceId: string;
  oldDomain: string;
  newDomain: string;
  page: number;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/update`,
    ...(delay && { delay }),
    body: {
      workspaceId,
      oldDomain,
      newDomain,
      page,
    },
  });
}

export async function queueDomainDeletion({
  workspaceId,
  domain,
  delay,
}: {
  workspaceId: string;
  domain: string;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/delete`,
    ...(delay && { delay }),
    body: {
      workspaceId,
      domain,
    },
  });
}
