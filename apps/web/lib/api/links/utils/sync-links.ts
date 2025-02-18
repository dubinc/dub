import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function scheduleLinkSync({
  folderId,
  delay,
}: {
  folderId: string;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/sync-tinybird`,
    ...(delay && { delay }),
    body: {
      folderId,
    },
  });
}
