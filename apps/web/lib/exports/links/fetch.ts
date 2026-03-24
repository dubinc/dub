import {
  getLinksForWorkspace,
  GetLinksForWorkspaceProps,
} from "@/lib/api/links/get-links-for-workspace";

export async function* fetchLinksBatch(
  filters: Omit<
    GetLinksForWorkspaceProps,
    "page" | "pageSize" | "startingAfter" | "endingBefore"
  >,
  pageSize: number = 1000,
) {
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const links = await getLinksForWorkspace({
      ...filters,
      pageSize,
      ...(cursor
        ? { startingAfter: cursor }
        : { page: 1 }),
    });

    if (links.length > 0) {
      yield { links };
      cursor = links[links.length - 1].id;
      hasMore = links.length === pageSize;
    } else {
      hasMore = false;
    }
  }
}
