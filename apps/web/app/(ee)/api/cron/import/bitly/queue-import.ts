import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

// Queue a Bitly import
export const queueBitlyImport = async (payload: {
  workspaceId: string;
  userId: string;
  bitlyGroup: string;
  domains: string[];
  folderId?: string;
  tagsToId?: Record<string, string>;
  searchAfter?: string | null;
  count?: number;
  rateLimited?: boolean;
  delay?: number;
}) => {
  const { tagsToId, delay, ...rest } = payload;

  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/bitly`,
    body: {
      ...rest,
      importTags: tagsToId ? true : false,
    },
    ...(delay && { delay }),
  });
};
