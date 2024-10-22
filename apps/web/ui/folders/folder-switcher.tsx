import { Folder } from "@/lib/folder/types";
import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  PenWriting,
  Popover,
  Tick,
  useKeyboardShortcut,
  useRouterStuff,
  Users,
} from "@dub/ui";
import { FolderPlus } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { ChevronLeft, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAddFolderModal } from "../modals/add-folder-modal";
import { useDeleteFolderModal } from "../modals/delete-folder-modal";
import { useRenameFolderModal } from "../modals/rename-folder-modal";
import { Chart, Delete, ThreeDots } from "../shared/icons";
import { FolderAccessIcon } from "./folder-access-icon";
import { useFolderPermissionsPanel } from "./folder-permissions-panel";

type FolderSummary = Pick<Folder, "id" | "name" | "accessLevel" | "linkCount">;

const allLinksOverview: FolderSummary = {
  id: "unsorted",
  name: "Links",
  accessLevel: "edit",
  linkCount: -1,
};

export const FolderSwitcher = () => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const { folders, isLoading } = useFolders();
  const [openPopover, setOpenPopover] = useState(false);
  const { AddFolderModal, setShowAddFolderModal } = useAddFolderModal();

  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    allLinksOverview,
  );

  const folderId = searchParams.get("folderId");
  const isAllLinksFolderSelected = selectedFolder?.id === "unsorted";

  // set the selected folder if the folderId is in the search params
  useEffect(() => {
    if (!folderId || !folders) {
      return;
    }

    const selectedFolder = folders.find((folder) => folder.id === folderId);

    if (selectedFolder) {
      setSelectedFolder(selectedFolder);
    }
  }, [folderId, folders]);

  // set the folderId in the search params
  const onFolderSelect = useCallback((folder: FolderSummary) => {
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
  }, []);

  if (isLoading || !folders) {
    return <FolderSwitcherPlaceholder />;
  }

  return (
    <>
      <AddFolderModal />

      {!isAllLinksFolderSelected && (
        <button
          onClick={() => {
            onFolderSelect(allLinksOverview);
          }}
          className="rounded-md px-1.5 py-2.5 hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </button>
      )}

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
        <button className="group -my-1 flex items-center gap-2 rounded-lg py-1 pl-2 pr-1 transition-colors duration-75 hover:bg-gray-100 data-[state=open]:bg-gray-200">
          <h1 className="text-xl font-semibold leading-7 text-neutral-900 md:text-2xl">
            {selectedFolder?.name}
          </h1>
          <ChevronsUpDown
            className="size-5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
        </button>
      </Popover>

      {selectedFolder && !isAllLinksFolderSelected && (
        <FolderActions
          folder={selectedFolder}
          onDelete={() => onFolderSelect(allLinksOverview)}
        />
      )}
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

      {folders.map((folder) => {
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
              onFolderSelect(folder);
            }}
          >
            <FolderAccessIcon folder={folder} withBorder={false} />
            <span
              className={`inline-flex items-center justify-start gap-1.5 truncate text-sm sm:max-w-[140px] ${
                selectedFolder?.id === folder.id ? "font-medium" : "font-normal"
              }`}
            >
              {folder.name}

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
          <FolderPlus className="size-4 text-gray-700" />
        </div>
        <span className="block truncate">Create new folder</span>
      </button>
    </div>
  );
};

const FolderActions = ({
  folder,
  onDelete,
}: {
  folder: FolderSummary;
  onDelete: () => void;
}) => {
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const canUpdateFolder = useCheckFolderPermission(folder.id, "folders.write");

  const { RenameFolderModal, setShowRenameFolderModal } =
    useRenameFolderModal(folder);

  const { DeleteFolderModal, setShowDeleteFolderModal } = useDeleteFolderModal(
    folder,
    onDelete,
  );

  const { folderPermissionsPanel, setShowFolderPermissionsPanel } =
    useFolderPermissionsPanel(folder);

  useKeyboardShortcut(["r", "m", "x", "a"], (e) => {
    setOpenPopover(false);
    switch (e.key) {
      case "a":
        router.push(`/${workspaceSlug}/analytics?folderId=${folder.id}`);
        break;
      case "r":
        if (canUpdateFolder) {
          setShowRenameFolderModal(true);
        }
        break;
      case "m":
        setShowFolderPermissionsPanel(true);
        break;
      case "x":
        if (canUpdateFolder) {
          setShowDeleteFolderModal(true);
        }
        break;
    }
  });

  return (
    <>
      <RenameFolderModal />
      <DeleteFolderModal />
      {folderPermissionsPanel}
      <Popover
        content={
          <div className="grid w-full gap-px p-2 sm:w-48">
            <Button
              text="Analytics"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                router.push(
                  `/${workspaceSlug}/analytics?folderId=${folder.id}`,
                );
              }}
              icon={<Chart className="h-4 w-4" />}
              shortcut="A"
              className="h-9 px-2 font-medium"
            />

            {canUpdateFolder && (
              <Button
                text="Rename"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowRenameFolderModal(true);
                }}
                icon={<PenWriting className="h-4 w-4" />}
                shortcut="R"
                className="h-9 px-2 font-medium"
              />
            )}

            <Button
              text="Members"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                setShowFolderPermissionsPanel(true);
              }}
              icon={<Users className="h-4 w-4" />}
              shortcut="M"
              className="h-9 px-2 font-medium"
            />

            {canUpdateFolder && (
              <Button
                text="Delete"
                variant="danger-outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowDeleteFolderModal(true);
                }}
                icon={<Delete className="h-4 w-4" />}
                shortcut="X"
                className="h-9 px-2 font-medium"
              />
            )}
          </div>
        }
        align="start"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <Button
          variant="secondary"
          className={cn(
            "w-fit bg-transparent px-1.5 outline-none transition-all duration-200 hover:bg-gray-100",
            "border-transparent data-[state=open]:border-gray-500 sm:group-hover/card:data-[state=closed]:border-gray-200",
          )}
          onClick={() => setOpenPopover(true)}
          icon={<ThreeDots className="h-5 w-5 shrink-0 text-gray-400" />}
        />
      </Popover>
    </>
  );
};

const FolderSwitcherPlaceholder = () => {
  return (
    <div className="h-7 w-20 animate-pulse rounded-lg bg-gray-200 sm:w-32 md:h-9" />
  );
};
