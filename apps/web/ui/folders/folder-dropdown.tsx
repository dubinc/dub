import { FolderSummary, unsortedLinks } from "@/lib/folder/types";
import useFolders from "@/lib/swr/use-folders";
import { Popover, Tick } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAddFolderModal } from "../modals/add-folder-modal";
import { FolderSquareIcon } from "./folder-access-icon";

interface FolderDropdownProps {
  onFolderSelect: (folder: FolderSummary) => void;
}

export const FolderDropdown = ({ onFolderSelect }: FolderDropdownProps) => {
  const searchParams = useSearchParams();
  const { folders, isLoading } = useFolders();
  const [openPopover, setOpenPopover] = useState(false);
  const { AddFolderModal, setShowAddFolderModal } = useAddFolderModal();
  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    null,
  );

  useEffect(() => {
    if (selectedFolder) {
      return;
    }

    const folderId = searchParams.get("folderId");

    if (!folderId) {
      setSelectedFolder(unsortedLinks);
      return;
    }

    if (folderId) {
      const folder = folders?.find((f) => f.id === folderId);

      if (folder) {
        setSelectedFolder(folder);
      }
    }
  }, [searchParams, folders, onFolderSelect]);

  useEffect(() => {
    onFolderSelect(selectedFolder || unsortedLinks);
  }, [selectedFolder, onFolderSelect]);

  if (isLoading || !folders) {
    return <FolderSwitcherPlaceholder />;
  }

  const foldersWithAllLinks = [unsortedLinks, ...folders];

  return (
    <>
      <AddFolderModal />
      <Popover
        content={
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

            {foldersWithAllLinks.map((folder) => {
              return (
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
                    setSelectedFolder(folder);
                  }}
                >
                  <FolderSquareIcon folder={folder} />
                  <span
                    className={`flex items-center justify-start gap-1.5 text-sm sm:max-w-[140px] ${
                      selectedFolder?.id === folder.id
                        ? "font-medium"
                        : "font-normal"
                    }`}
                  >
                    <span className="truncate">{folder.name}</span>

                    {folder.id === "unsorted" && (
                      <div className="rounded bg-gray-100 p-1">
                        <div className="text-xs font-normal text-black">
                          Unsorted
                        </div>
                      </div>
                    )}
                  </span>

                  {selectedFolder?.id === folder.id && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
                      <Tick className="size-5" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}

            <button
              key="add-folder"
              className="relative flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
              onClick={() => {
                setOpenPopover(false);
                setShowAddFolderModal(true);
              }}
            >
              <FolderSquareIcon folder={{ id: "new", accessLevel: null }} />
              <span className="block truncate">Create new folder</span>
            </button>
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="start"
      >
        <button className="group flex w-36 min-w-0 items-center gap-2 rounded-lg transition-colors duration-75 hover:bg-gray-100 data-[state=open]:bg-gray-200">
          {selectedFolder && <FolderSquareIcon folder={selectedFolder} />}
          <h1 className="min-w-0 truncate text-left text-lg font-medium leading-7 text-neutral-900">
            {selectedFolder?.name}
          </h1>
        </button>
      </Popover>
    </>
  );
};

const FolderSwitcherPlaceholder = () => {
  return (
    <div className="h-7 w-20 animate-pulse rounded-lg bg-gray-200 sm:w-32 md:h-9" />
  );
};
