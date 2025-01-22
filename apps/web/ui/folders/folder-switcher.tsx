import { FolderSummary, unsortedLinks } from "@/lib/folder/types";
import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  PenWriting,
  Popover,
  useKeyboardShortcut,
  useRouterStuff,
  Users,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDeleteFolderModal } from "../modals/delete-folder-modal";
import { useRenameFolderModal } from "../modals/rename-folder-modal";
import { Chart, Delete, ThreeDots } from "../shared/icons";
import { FolderDropdown } from "./folder-dropdown";
import { useFolderPermissionsPanel } from "./folder-permissions-panel";

export const FolderSwitcher = () => {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const { folders, loading } = useFolders();

  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    unsortedLinks,
  );

  const folderId = searchParams.get("folderId");
  const isUnsortedFolderSelected = selectedFolder?.id === "unsorted";

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

  if (loading || !folders) {
    return <FolderSwitcherPlaceholder />;
  }

  return (
    <div className="flex w-full items-center">
      {!isUnsortedFolderSelected && (
        <button
          onClick={() => {
            onFolderSelect(unsortedLinks);
          }}
          className="rounded-md px-1.5 py-2.5 hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </button>
      )}

      <FolderDropdown onFolderSelect={onFolderSelect} />

      {selectedFolder && !isUnsortedFolderSelected && (
        <FolderActions
          folder={selectedFolder}
          onDelete={() => onFolderSelect(unsortedLinks)}
        />
      )}
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
