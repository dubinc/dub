import { recordLink } from "@/lib/tinybird";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils/transform-link";

export async function propagateBulkLinkChanges({
  links,
  skipRedisCache = false,
}: {
  links: ExpandedLink[];
  skipRedisCache?: boolean;
}) {
  return await Promise.all([
    // update Redis cache
    !skipRedisCache && linkCache.mset(links),
    // update Tinybird
    recordLink(links),
  ]);
}
