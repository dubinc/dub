import { recordLink } from "@/lib/tinybird";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils";

export async function propagateBulkLinkChanges(
  links: ExpandedLink[],
  updateCache?: boolean,
) {
  return await Promise.all([
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
        created_at: link.createdAt,
      })),
    ),
    // update Redis
    updateCache && linkCache.mset(links),
  ]);
}
