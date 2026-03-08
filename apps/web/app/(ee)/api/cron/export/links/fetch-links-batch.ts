import {
  getLinksForWorkspace,
  GetLinksForWorkspaceProps,
} from "@/lib/api/links/get-links-for-workspace";

export async function* fetchLinksBatch(
  filters: Omit<GetLinksForWorkspaceProps, "page" | "pageSize">,
  pageSize: number = 1000,
) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const links = await getLinksForWorkspace({
      ...filters,
      page,
      pageSize,
    });

    if (links.length > 0) {
      yield { links };
      page++;
      hasMore = links.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}
