import { Folder } from "@/lib/link-folder/types";
import useFolders from "@/lib/swr/use-folders";
import { Popover, Tick, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronsUpDown, FolderCheck, FolderPlusIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useAddFolderModal } from "../modals/add-folder-modal";

type FolderSummary = Pick<Folder, "id" | "name">;

const allLinksOverview: FolderSummary = {
  id: "all-links",
  name: "All links",
};

export const FolderSwitcher = () => {
  const { folders, isLoading } = useFolders();
  const [openPopover, setOpenPopover] = useState(false);
  const { queryParams, searchParamsObj } = useRouterStuff();
  const { AddFolderModal, setShowAddFolderModal } = useAddFolderModal();

  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    allLinksOverview,
  );

  const onFolderSelect = useCallback((folder: FolderSummary) => {
    setSelectedFolder(folder);

    if (folder.id === "all-links") {
      return queryParams({
        del: "folderId",
      });
    }

    queryParams({
      set: {
        folderId: folder.id,
      },
    });
  }, []);

  if (isLoading || !folders) {
    return <FolderSwitcherPlaceholder />;
  }

  return (
    <>
      <AddFolderModal />
      <Popover
        content={
          <FolderList
            folders={[allLinksOverview, ...folders]}
            setOpenPopover={setOpenPopover}
            onFolderSelect={onFolderSelect}
            selectedFolder={selectedFolder}
            setShowAddFolderModal={setShowAddFolderModal}
          />
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="start"
      >
        <button className="flex items-center justify-between space-x-2 rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            {selectedFolder?.name}
          </h1>
          <ChevronsUpDown
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </button>
      </Popover>
    </>
  );
};

const FolderList = ({
  folders,
  setOpenPopover,
  onFolderSelect,
  selectedFolder,
  setShowAddFolderModal,
}: {
  folders: FolderSummary[];
  setOpenPopover: (open: boolean) => void;
  onFolderSelect: (folder: FolderSummary) => void;
  setShowAddFolderModal: (show: boolean) => void;
  selectedFolder: FolderSummary | null;
}) => {
  return (
    <div className="relative mt-1 max-h-72 w-full space-y-0.5 overflow-auto rounded-md bg-white p-2 text-base sm:w-60 sm:text-sm sm:shadow-lg">
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="text-xs text-gray-500">Folders</p>
        {folders.length > 0 && (
          <Link
            href="/settings/folders"
            onClick={() => setOpenPopover(false)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-100"
          >
            View All
          </Link>
        )}
      </div>

      {folders.map(({ id, name }) => {
        return (
          <button
            key={id}
            className={cn(
              "relative flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200",
              {
                "font-medium": selectedFolder?.id === id,
              },
            )}
            onClick={() => {
              setOpenPopover(false);
              onFolderSelect({ id, name });
            }}
          >
            <div className="flex size-7 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-t from-gray-100 group-hover:bg-white">
              <FolderCheck className="size-3" aria-hidden="true" />
            </div>

            <span
              className={`block truncate text-sm sm:max-w-[140px] ${
                selectedFolder?.id === id ? "font-medium" : "font-normal"
              }`}
            >
              {name}
            </span>

            {selectedFolder?.id === id && (
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
        <div className="flex size-7 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-t from-gray-100 group-hover:bg-white">
          <FolderPlusIcon className="size-4 text-gray-700" />
        </div>
        <span className="block truncate">Create new folder</span>
      </button>
    </div>
  );
};

const FolderSwitcherPlaceholder = () => {
  return (
    <div className="flex animate-pulse items-center space-x-1.5 rounded-lg px-1.5 py-2 sm:w-60">
      <div className="hidden h-8 w-28 animate-pulse rounded-md bg-gray-200 sm:block sm:w-40" />
      <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
    </div>
  );
};
