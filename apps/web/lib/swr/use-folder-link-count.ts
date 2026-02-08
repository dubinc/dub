import { useMemo } from "react";
import { FolderLinkCount } from "../types";
import useLinksCount from "./use-links-count";

export function useFolderLinkCount({
  folderId,
  enabled = true,
}: {
  folderId: string | null;
  enabled?: boolean;
}) {
  const { data: folderLinksCount, loading } = useLinksCount<FolderLinkCount[]>({
    enabled,
    query: {
      groupBy: "folderId",
    },
    ignoreParams: true,
  });

  const folderLinkCount = useMemo(() => {
    return (
      folderLinksCount?.find(
        ({ folderId: id }) =>
          id === folderId || (id === null && folderId === "unsorted"),
      )?._count || 0
    );
  }, [folderLinksCount, folderId]);

  return { folderLinkCount, loading };
}
