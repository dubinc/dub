import { getPlatformAdapter } from "@/lib/social-platforms";
import { ScrapeCreatorsContentError } from "@/lib/social-platforms/scrape-creators";
import { SocialContent } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { PlatformType } from "@dub/prisma/client";
import { hashStringSHA256, isValidUrl } from "@dub/utils";
import { waitUntil } from "@vercel/functions";

const CACHE_KEY_PREFIX = "socialContentCache";
const CACHE_TTL = 60 * 60;

interface GetSocialContentStatsParams {
  platform: PlatformType;
  url: string;
}

const EMPTY_SOCIAL_CONTENT: SocialContent = {
  publishedAt: null,
  platformId: null,
  handle: null,
  likes: 0,
  views: 0,
  title: null,
  description: null,
  thumbnailUrl: null,
};

export async function getSocialContent({
  platform,
  url,
}: GetSocialContentStatsParams): Promise<SocialContent> {
  url = url?.trim();

  // Invalid URL
  if (!url || !isValidUrl(url)) {
    return EMPTY_SOCIAL_CONTENT;
  }

  url = normalizeUrl(url);

  // Check cache first
  const urlHash = await hashStringSHA256(url);
  const cacheKey = `${CACHE_KEY_PREFIX}:${urlHash}`;

  const cachedResult = await redis.get<SocialContent>(cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  const platformAdapter = getPlatformAdapter(platform);

  if (!platformAdapter) {
    return EMPTY_SOCIAL_CONTENT;
  }

  let result: SocialContent;

  try {
    result = await platformAdapter.fetchPost(url);
  } catch (error) {
    // Post not found
    // Cache empty result, so that we don't keep trying to scrape the same post.
    if (error instanceof ScrapeCreatorsContentError && error.status === 404) {
      waitUntil(
        redis.set(cacheKey, EMPTY_SOCIAL_CONTENT, {
          ex: CACHE_TTL * 24 * 30,
        }),
      );
    }

    // We don't cache other errors because they are likely to be transient.
    return EMPTY_SOCIAL_CONTENT;
  }

  waitUntil(redis.set(cacheKey, result, { ex: CACHE_TTL }));

  return result;
}

function normalizeUrl(raw: string) {
  const url = new URL(raw);

  // Lowercase hostname
  url.hostname = url.hostname.toLowerCase();

  // Remove tracking params
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "si",
    "feature",
    "igshid",
    "t",
  ].forEach((p) => url.searchParams.delete(p));

  // Remove trailing slash
  url.pathname = url.pathname.replace(/\/$/, "");

  return url.toString();
}
