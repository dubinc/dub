import { recordLink } from "@/lib/tinybird";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils/transform-link";

export async function propagateBulkLinkChanges(links: ExpandedLink[]) {
  return await Promise.all([
    // update Redis cache
    linkCache.mset(links),
    // update Tinybird
    recordLink(links),
  ]);
}
