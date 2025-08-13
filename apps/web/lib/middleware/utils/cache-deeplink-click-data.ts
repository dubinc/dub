import { redis } from "@/lib/upstash";
import { ipAddress } from "@vercel/functions";

export type DeepLinkClickData = {
  clickId: string;
  link: { id: string; domain: string; key: string; url: string };
};

export async function cacheDeepLinkClickData({
  req,
  clickId,
  link,
}: {
  req: Request;
  clickId: string;
  link: { id: string; domain: string; key: string; url: string };
}) {
  const ip = ipAddress(req);
  return await redis.set<DeepLinkClickData>(
    `deepLinkClickCache:${ip}:${link.domain}:${link.key}`,
    {
      clickId,
      link,
    },
    {
      ex: 60 * 60,
    },
  );
}
