import { unsortedLinks } from "@/lib/folder/constants";
import useFolders from "@/lib/swr/use-folders";
import { FolderSummary } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FolderActions } from "./folder-actions";
import { FolderDropdown } from "./folder-dropdown";

export const FolderSwitcher = () => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const { folders } = useFolders();

  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    unsortedLinks,
  );

  useEffect(() => {
    const folderId = searchParams.get("folderId");

    if (folders) {
      const selectedFolder =
        folders.find((folder) => folder.id === folderId) || unsortedLinks;
      setSelectedFolder(selectedFolder);
    }
  }, [searchParams, folders]);

  // set the folderId in the search params
  const onFolderSelect = useCallback(
    (folder: FolderSummary) => {
      setSelectedFolder(folder);

      if (folder.id === "unsorted") {
        return queryParams({
          del: "folderId",
        });
      }

      queryParams({
        set: {
          folderId: folder.id,
        },
      });
    },
    [selectedFolder],
  );

  const isUnsorted = selectedFolder?.id === "unsorted";

  return (
    <div className="-ml-2 -mt-1 flex w-full items-center gap-1">
      <FolderDropdown onFolderSelect={onFolderSelect} hideFolderIcon={true} />

      {selectedFolder && !isUnsorted && (
        <FolderActions
          folder={selectedFolder}
          onDelete={() => onFolderSelect(unsortedLinks)}
        />
      )}
    </div>
  );
};
