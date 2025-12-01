import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSummary } from "@/lib/types";
import {
  Button,
  CircleCheck,
  Copy,
  LinesY,
  PenWriting,
  Popover,
  ReferredVia,
  useCopyToClipboard,
  useKeyboardShortcut,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteFolderModal } from "../modals/delete-folder-modal";
import { useRenameFolderModal } from "../modals/rename-folder-modal";
import { useDefaultFolderModal } from "../modals/set-default-folder-modal";
import { useShareDashboardModal } from "../modals/share-dashboard-modal";
import { Delete, ThreeDots } from "../shared/icons";
import { useEditFolderSheet } from "./edit-folder-sheet";
import { isDefaultFolder } from "./utils";

export const FolderActions = ({
  folder,
  onDelete,
  className,
}: {
  folder: FolderSummary;
  onDelete?: () => void;
  className?: string;
}) => {
  const router = useRouter();
  const [openPopover, setOpenPopover] = useState(false);
  const { slug: workspaceSlug, defaultFolderId } = useWorkspace();

  const { RenameFolderModal, setShowRenameFolderModal } =
    useRenameFolderModal(folder);

  const { DeleteFolderModal, setShowDeleteFolderModal } = useDeleteFolderModal(
    folder,
    onDelete,
  );

  const { DefaultFolderModal, setShowDefaultFolderModal } =
    useDefaultFolderModal({
      folder,
    });

  const {
    EditFolderSheet: folderPermissionsPanel,
    setShowEditFolderSheet: setShowFolderPermissionsPanel,
  } = useEditFolderSheet(folder);

  const { ShareDashboardModal, setShowShareDashboardModal } =
    useShareDashboardModal({ folderId: folder.id });

  const copyFolderId = () => {
    toast.promise(copyToClipboard(folder.id), {
      success: "Folder ID copied!",
    });
  };

  const [copiedFolderId, copyToClipboard] = useCopyToClipboard();
  const canUpdateFolder = useCheckFolderPermission(folder.id, "folders.write");

  const isDefault = isDefaultFolder({ folder, defaultFolderId });
  const unsortedLinks = folder.id === "unsorted";

  useKeyboardShortcut(
    ["r", "m", "i", "x", "a", "s", "d"],
    (e) => {
      setOpenPopover(false);
      switch (e.key) {
        case "a":
          if (!unsortedLinks) {
            router.push(
              `/${workspaceSlug}/analytics${
                folder.id === "unsorted" ? "" : `?folderId=${folder.id}`
              }`,
            );
          }
          break;
        case `s`:
          if (canUpdateFolder) setShowShareDashboardModal(true);
          break;
        case "m":
          if (!unsortedLinks) {
            setShowFolderPermissionsPanel(true);
          }
          break;
        case "i":
          if (!unsortedLinks) {
            copyFolderId();
          }
          break;
        case "d":
          if (!isDefault) {
            setShowDefaultFolderModal(true);
          }
          break;
        case "r":
          if (canUpdateFolder) {
            setShowRenameFolderModal(true);
          }
          break;
        case "x":
          if (canUpdateFolder) {
            setShowDeleteFolderModal(true);
          }
          break;
      }
    },
    {
      enabled: openPopover,
    },
  );

  return (
    <>
      <RenameFolderModal />
      <DeleteFolderModal />
      <DefaultFolderModal />
      <ShareDashboardModal />
      {folderPermissionsPanel}
      <Popover
        content={
          <div className="divide-border-subtle grid w-full divide-y sm:w-52">
            {!unsortedLinks && (
              <div className="flex flex-col gap-px p-2">
                <Button
                  text="Edit"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowFolderPermissionsPanel(true);
                  }}
                  icon={<PenWriting className="h-4 w-4" />}
                  shortcut="M"
                  className="h-9 px-2 font-medium"
                />
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
                  disabled={!canUpdateFolder}
                  disabledTooltip={
                    !canUpdateFolder
                      ? "Only folder owners can delete a folder."
                      : undefined
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-px p-2">
              <Link
                href={`/${workspaceSlug}/analytics${
                  folder.id === "unsorted" ? "" : `?folderId=${folder.id}`
                }`}
              >
                <Button
                  text="View Analytics"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                  }}
                  icon={<LinesY className="h-4 w-4" />}
                  shortcut="A"
                  className="h-9 px-2 font-medium"
                />
              </Link>

              {canUpdateFolder && (
                <Button
                  text="Share Analytics"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowShareDashboardModal(true);
                  }}
                  icon={<ReferredVia className="size-4" />}
                  shortcut="S"
                  className="h-9 px-2 font-medium"
                />
              )}
            </div>

            <div className="flex flex-col gap-px p-2">
              <Button
                text="Set as Default"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowDefaultFolderModal(true);
                }}
                icon={<Bookmark className="h-4 w-4" />}
                shortcut="D"
                className="h-9 px-2 font-medium"
                disabled={isDefault}
                disabledTooltip={
                  isDefault ? "This is your default folder." : undefined
                }
              />

              {!unsortedLinks && (
                <Button
                  text="Copy Folder ID"
                  variant="outline"
                  onClick={() => copyFolderId()}
                  icon={
                    copiedFolderId ? (
                      <CircleCheck className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )
                  }
                  shortcut="I"
                  className="h-9 px-2 font-medium"
                />
              )}
            </div>
          </div>
        }
        align="start"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <Button
          variant="secondary"
          className={cn(
            "h-8 flex-1 bg-transparent px-1 outline-none transition-all duration-200",
            "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
            className,
          )}
          onClick={() => setOpenPopover(true)}
          icon={<ThreeDots className="size-4 shrink-0 text-neutral-600" />}
        />
      </Popover>
    </>
  );
};
