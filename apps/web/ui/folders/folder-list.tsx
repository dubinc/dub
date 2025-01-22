import { allLinksOverview, FolderSummary } from "@/lib/folder/types";
import useFolders from "@/lib/swr/use-folders";
import { FolderPlus, Tick } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { FolderAccessIcon } from "./folder-icon";

interface FolderListProps {
  setOpenPopover: (open: boolean) => void;
  onFolderSelect?: (folder: FolderSummary) => void;
  setShowAddFolderModal: (show: boolean) => void;
  selectedFolder: FolderSummary | null;
}


export const FolderList = ({
  setOpenPopover,
  onFolderSelect,
  selectedFolder,
  setShowAddFolderModal,
}: FolderListProps) => {
  const { folders, isLoading } = useFolders();

  if (isLoading || !folders) {
    return null;
  }

  const foldersWithAllLinks = [allLinksOverview, ...folders];

  return (
    <div className="relative mt-1 max-h-72 w-full space-y-0.5 overflow-auto rounded-md bg-white p-2 text-base sm:w-60 sm:text-sm sm:shadow-lg">
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="text-xs font-medium text-gray-500">Folders</p>
        {folders.length > 0 && (
          <Link
            href="/settings/library/folders"
            onClick={() => setOpenPopover(false)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-100"
          >
            View All
          </Link>
        )}
      </div>

      {foldersWithAllLinks.map((folder) => (
        <button
          key={folder.id}
          className={cn(
            "relative flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200",
            {
              "font-medium": selectedFolder?.id === folder.id,
            },
          )}
          onClick={() => {
            setOpenPopover(false);
            onFolderSelect?.(folder);
          }}
        >
          <FolderAccessIcon folder={folder} withBorder={false} />
          <span
            className={`flex items-center justify-start gap-1.5 text-sm sm:max-w-[140px] ${
              selectedFolder?.id === folder.id ? "font-medium" : "font-normal"
            }`}
          >
            <span className="truncate">{folder.name}</span>

            {folder.id === "unsorted" && (
              <div className="rounded bg-gray-100 p-1">
                <div className="text-xs font-normal text-black">Unsorted</div>
              </div>
            )}
          </span>

          {selectedFolder?.id === folder.id && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
              <Tick className="size-5" aria-hidden="true" />
            </span>
          )}
        </button>
      ))}

      <button
        key="add-folder"
        className="relative flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
        onClick={() => {
          setOpenPopover(false);
          setShowAddFolderModal(true);
        }}
      >
        <div className="flex size-7 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-t from-gray-100 group-hover:bg-white">
          <FolderPlus className="size-4 text-gray-700" />
        </div>
        <span className="block truncate">Create new folder</span>
      </button>
    </div>
  );
};
