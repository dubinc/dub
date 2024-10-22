import { recordLink } from "@/lib/tinybird";
import { linkCache } from "./cache";
import { LinkWithTags } from "./utils";

export async function propagateBulkLinkChanges(links: LinkWithTags[]) {
  await Promise.all([
    // update Redis
    linkCache.mset(links),

    // update Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags?.map(({ tag }) => tag.id) ?? [],
        workspace_id: link.projectId,
        created_at: link.createdAt,
      })),
    ),
  ]);
}
