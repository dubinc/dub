import { unsortedLinks } from "@/lib/folder/constants";
import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSummary } from "@/lib/types";
import { Popover, Tick } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAddFolderModal } from "../modals/add-folder-modal";
import { FolderIcon } from "./folder-icon";

interface FolderDropdownProps {
  onFolderSelect: (folder: FolderSummary) => void;
  hideViewAll?: boolean;
  hideFolderIcon?: boolean;
  textClassName?: string;
}

export const FolderDropdown = ({
  onFolderSelect,
  hideViewAll = false,
  hideFolderIcon = false,
  textClassName,
}: FolderDropdownProps) => {
  const { slug: workspaceSlug } = useWorkspace();

  const searchParams = useSearchParams();
  const { folders, loading } = useFolders();
  const [openPopover, setOpenPopover] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    unsortedLinks,
  );
  const folderId = searchParams.get("folderId");

  const { AddFolderModal, setShowAddFolderModal } = useAddFolderModal({
    onSuccess: (folder) => {
      setSelectedFolder(folder);
      onFolderSelect?.(folder);
    },
  });

  useEffect(() => {
    if (folders) {
      const folder = folders.find((f) => f.id === folderId) || unsortedLinks;
      setSelectedFolder(folder);
      onFolderSelect?.(folder);
    }
  }, [folderId, folders]);

  const isLoading = loading || !folders;

  if (folderId && isLoading) {
    return <FolderSwitcherPlaceholder />;
  }

  return (
    <>
      <AddFolderModal />
      <Popover
        content={
          folders && (
            <div className="relative mt-1 max-h-80 w-full space-y-0.5 overflow-auto rounded-md bg-white p-2 text-base sm:w-60 sm:text-sm sm:shadow-lg">
              <div className="flex items-center justify-between px-2 pb-1">
                <p className="text-xs font-medium text-gray-500">Folders</p>
                {!hideViewAll && folders.length > 0 && (
                  <Link
                    href={`/${workspaceSlug}/settings/library/folders`}
                    onClick={() => setOpenPopover(false)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-100"
                  >
                    View All
                  </Link>
                )}
              </div>

              {[unsortedLinks, ...folders].map((folder) => {
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
                      onFolderSelect?.(folder);
                    }}
                  >
                    <FolderIcon folder={folder} shape="square" />
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
                <FolderIcon
                  folder={{ id: "new", accessLevel: null }}
                  shape="square"
                />
                <span className="block truncate">Create new folder</span>
              </button>
            </div>
          )
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="start"
        popoverContentClassName="-ml-1"
      >
        <button
          className={cn(
            "group flex max-w-60 items-center gap-2 rounded-lg px-2 py-1",
            isLoading
              ? "cursor-not-allowed"
              : "transition-colors hover:bg-neutral-100 active:bg-neutral-200 data-[state=open]:bg-neutral-100",
          )}
          disabled={isLoading}
        >
          {!hideFolderIcon && selectedFolder && (
            <FolderIcon folder={selectedFolder} shape="square" />
          )}

          <h1
            className={cn(
              "min-w-0 truncate text-left text-xl font-semibold leading-7 text-neutral-900 md:text-2xl",
              textClassName,
            )}
          >
            {selectedFolder ? selectedFolder.name : "Links"}
          </h1>

          <ChevronsUpDown className="ml-auto size-4 shrink-0 text-neutral-400" />
        </button>
      </Popover>
    </>
  );
};

const FolderSwitcherPlaceholder = () => {
  return <div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-200" />;
};
