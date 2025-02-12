import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSummary } from "@/lib/types";
import {
  Button,
  CircleCheck,
  Copy,
  PenWriting,
  Popover,
  useCopyToClipboard,
  useKeyboardShortcut,
  Users,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteFolderModal } from "../modals/delete-folder-modal";
import { useRenameFolderModal } from "../modals/rename-folder-modal";
import { Chart, Delete, ThreeDots } from "../shared/icons";
import { useFolderPermissionsPanel } from "./folder-permissions-panel";

export const FolderActions = ({
  folder,
  onDelete,
}: {
  folder: FolderSummary;
  onDelete?: () => void;
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

  const [copiedFolderId, copyToClipboard] = useCopyToClipboard();

  const copyFolderId = () => {
    toast.promise(copyToClipboard(folder.id), {
      success: "Folder ID copied!",
    });
  };

  useKeyboardShortcut(
    ["r", "m", "i", "x", "a"],
    (e) => {
      setOpenPopover(false);
      switch (e.key) {
        case "a":
          router.push(`/${workspaceSlug}/analytics?folderId=${folder.id}`);
          break;
        case "m":
          setShowFolderPermissionsPanel(true);
          break;
        case "i":
          copyFolderId();
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
      {folderPermissionsPanel}
      <Popover
        content={
          <div className="grid w-full divide-y divide-neutral-200 sm:w-52">
            <div className="grid gap-px p-2">
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
            </div>
            <div className="grid gap-px p-2">
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

              {canUpdateFolder && (
                <>
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
                </>
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
            "h-8 bg-transparent px-1 outline-none transition-all duration-200",
            "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
          )}
          onClick={() => setOpenPopover(true)}
          icon={<ThreeDots className="size-4 shrink-0 text-neutral-500" />}
        />
      </Popover>
    </>
  );
};
