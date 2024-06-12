import { getDomainWithoutWWW, isIframeable } from "@dub/utils";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { LinkProps, RedisDomainProps, RedisLinkProps } from "./types";

// Initiate Redis instance by connecting to REST URL
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const ratelimitRedis = new Redis({
  url:
    process.env.RATELIMIT_UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "",
  token:
    process.env.RATELIMIT_UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "",
});

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  return new Ratelimit({
    redis: ratelimitRedis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "dub",
  });
};

/**
 * Recording metatags that were generated via `/api/metatags`
 * If there's an error, it will be logged to a separate redis list for debugging
 **/
export async function recordMetatags(url: string, error: boolean) {
  if (url === "https://github.com/dubinc/dub") {
    // don't log metatag generation for default URL
    return null;
  }

  if (error) {
    return await ratelimitRedis.zincrby("metatags-error-zset", 1, url);
  }

  const domain = getDomainWithoutWWW(url);
  return await ratelimitRedis.zincrby("metatags-zset", 1, domain);
}

export async function formatRedisLink(
  link: LinkProps,
): Promise<RedisLinkProps> {
  const {
    id,
    domain,
    url,
    trackConversion,
    password,
    proxy,
    rewrite,
    expiresAt,
    expiredUrl,
    ios,
    android,
    geo,
    projectId,
  } = link;
  const hasPassword = password && password.length > 0 ? true : false;

  return {
    id,
    url,
    ...(trackConversion && { trackConversion: true }),
    ...(hasPassword && { password: true }),
    ...(proxy && { proxy: true }),
    ...(rewrite && {
      rewrite: true,
      iframeable: await isIframeable({ url, requestDomain: domain }),
    }),
    ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    ...(expiredUrl && { expiredUrl }),
    ...(ios && { ios }),
    ...(android && { android }),
    ...(geo && { geo: geo as object }),
    ...(projectId && { projectId }), // projectId can be undefined for anonymous links
  };
}

// TODO:
// Can we replace this with the formatRedisLink function?
export async function formatRedisDomain(
  link: LinkProps,
): Promise<RedisDomainProps> {
  const { id, domain, url, rewrite, projectId, noindex } = link;

  return {
    id,
    ...(url && { url }), // on free plans you cannot set a root domain redirect, hence URL is undefined
    ...(url &&
      rewrite && {
        rewrite: true,
        iframeable: await isIframeable({ url, requestDomain: domain }),
      }),
    projectId: projectId!,
    ...(noindex && { noindex: true }),
  };
}
