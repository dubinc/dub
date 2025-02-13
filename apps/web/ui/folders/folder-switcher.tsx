import { unsortedLinks } from "@/lib/folder/constants";
import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSummary } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FolderActions } from "./folder-actions";
import { FolderDropdown } from "./folder-dropdown";

export const FolderSwitcher = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useWorkspace();
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

  const isUnsorted = selectedFolder?.id === "unsorted";

  return (
    <div className="-ml-2 -mt-1 flex w-full items-center gap-1">
      <FolderDropdown hideFolderIcon={true} />

      {selectedFolder && !isUnsorted && (
        <FolderActions
          folder={selectedFolder}
          onDelete={() => router.push(`/${slug}`)}
        />
      )}
    </div>
  );
};
