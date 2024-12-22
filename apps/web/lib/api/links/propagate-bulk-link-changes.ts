import { recordLink } from "@/lib/tinybird";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils/transform-link";

export async function propagateBulkLinkChanges(links: ExpandedLink[]) {
  return await Promise.all([
    // update Redis cache
    linkCache.mset(links),
    // update Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags?.map(({ tag }) => tag.id) ?? [],
        program_id: link.programId ?? "",
        workspace_id: link.projectId,
        folder_id: link.folderId,
        created_at: link.createdAt,
      })),
    ),
  ]);
}
