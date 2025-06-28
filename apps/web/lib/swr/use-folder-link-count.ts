import { useMemo } from "react";
import { FolderLinkCount } from "../types";
import useLinksCount from "./use-links-count";

export function useFolderLinkCount({ folderId }: { folderId: string | null }) {
  const { data: folderLinksCount, loading } = useLinksCount<FolderLinkCount[]>({
    query: {
      groupBy: "folderId",
    },
    ignoreParams: true,
    enabled: Boolean(folderId && folderId !== "unsorted"),
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
