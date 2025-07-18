import useFolders from "@/lib/swr/use-folders";
import useFoldersCount from "@/lib/swr/use-folders-count";
import useLinksCount from "@/lib/swr/use-links-count";
import { FolderLinkCount } from "@/lib/types";
import { FOLDERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/folders";
import { useMemo } from "react";

export function useFolderFilterOptions({ search }: { search: string }) {
  const { data: foldersCount } = useFoldersCount();
  const foldersAsync = Boolean(
    foldersCount && foldersCount > FOLDERS_MAX_PAGE_SIZE,
  );
  const { folders, loading: loadingFolders } = useFolders({
    query: { search: foldersAsync ? search : "" },
  });

  const { data: folderLinksCount } = useLinksCount<FolderLinkCount[]>({
    query: {
      groupBy: "folderId",
    },
  });

  const foldersResult = useMemo(() => {
    return (
      (loadingFolders ||
        [...(folders ?? [])]
          .map((folder) => ({
            ...folder,
            count:
              folderLinksCount?.find(
                ({ folderId }) =>
                  folderId === folder.id ||
                  (folder.id === "unsorted" && folderId === null),
              )?._count || 0,
          }))
          .sort((a, b) => b.count - a.count)) ??
      null
    );
  }, [loadingFolders, folders, folderLinksCount]);

  return { folders: foldersResult, foldersAsync };
}
