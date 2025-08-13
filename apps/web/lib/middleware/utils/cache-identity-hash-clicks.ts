import { redis } from "@/lib/upstash";
import { getIdentityHash } from "./get-identity-hash";

export type IdentityHashClicksData = {
  clickId: string;
  link: { id: string; domain: string; key: string; url: string };
};

export async function cacheIdentityHashClicks({
  req,
  clickId,
  link,
}: {
  req: Request;
  clickId: string;
  link: { id: string; domain: string; key: string; url: string };
}) {
  const identityHash = await getIdentityHash(req);
  return await redis.set<IdentityHashClicksData>(
    `iosClickCache:${identityHash}:${link.domain}:${link.key}`,
    {
      clickId,
      link,
    },
    {
      ex: 60 * 60,
    },
  );
}
