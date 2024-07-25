import { getDomainWithoutWWW } from "@dub/utils";
import { ratelimitRedis } from "./ratelimit";

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
