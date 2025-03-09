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

/**
 * Check if we're rate limited and handle accordingly
 */
export const checkIfRateLimited = async (bitlyApiKey: unknown, body: any) => {
  const path = "/groups/{group_guid}/bitlinks";

  const response = await fetch(
    `https://api-ssl.bitly.com/v4/user/platform_limits?path=${path}`,
    {
      headers: {
        Authorization: `Bearer ${bitlyApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = (await response.json()) as {
    platform_limits: {
      endpoint: string;
      methods: {
        name: string;
        limit: number;
        count: number;
      }[];
    }[];
  };

  const endpoint = data.platform_limits[0].methods.find(
    (method) => method.name === "GET",
  )!;

  const limit = endpoint.limit;
  const currentUsage = endpoint.count;

  console.log("checkIfRateLimited", endpoint);
  console.log("originalBody", body);

  const isRateLimited = currentUsage >= limit;

  if (isRateLimited) {
    await queueBitlyImport({
      ...body,
      rateLimited: true,
      delay: 2 * 60, // try again after 2 minutes
    });
  }

  return isRateLimited;
};
