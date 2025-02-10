"use client";

import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder } from "@/lib/types";
import {
  Button,
  PenWriting,
  Popover,
  useCopyToClipboard,
  useKeyboardShortcut,
  Users,
} from "@dub/ui";
import { CircleCheck, Copy, Globe } from "@dub/ui/icons";
import { cn, nFormatter } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteFolderModal } from "../modals/delete-folder-modal";
import { useRenameFolderModal } from "../modals/rename-folder-modal";
import { Chart, Delete, ThreeDots } from "../shared/icons";
import { FolderIcon } from "./folder-icon";
import { useFolderPermissionsPanel } from "./folder-permissions-panel";
import { RequestFolderEditAccessButton } from "./request-edit-button";

export const FolderCard = ({ folder }: { folder: Folder }) => {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [isHovering, setIsHovering] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);

  const { isLoading: isPermissionsLoading } = useFolderPermissions();
  const canUpdateFolder = useCheckFolderPermission(folder.id, "folders.write");
  const canCreateLinks = useCheckFolderPermission(
    folder.id,
    "folders.links.write",
  );

  const { RenameFolderModal, setShowRenameFolderModal } =
    useRenameFolderModal(folder);

  const { DeleteFolderModal, setShowDeleteFolderModal } =
    useDeleteFolderModal(folder);

  const { folderPermissionsPanel, setShowFolderPermissionsPanel } =
    useFolderPermissionsPanel(folder);

  const unsortedLinks = folder.id === "unsorted";

  useKeyboardShortcut(
    ["r", "m", "x", "a", "i"],
    (e) => {
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
        case "i":
          copyFolderId();
          break;
      }
    },
    {
      enabled: openPopover || (isHovering && !unsortedLinks),
    },
  );

  const [copiedFolderId, copyToClipboard] = useCopyToClipboard();

  const copyFolderId = () => {
    toast.promise(copyToClipboard(folder.id), {
      success: "Folder ID copied!",
    });
  };

  return (
    <>
      <RenameFolderModal />
      <DeleteFolderModal />
      {folderPermissionsPanel}
      <div
        className="hover:drop-shadow-card-hover flex flex-col justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 sm:h-36"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex items-center justify-between">
          <FolderIcon folder={folder} />

          {!unsortedLinks && (
            <div className="flex items-center justify-end gap-1">
              {!isPermissionsLoading && !canCreateLinks && (
                <RequestFolderEditAccessButton
                  folderId={folder.id}
                  workspaceId={workspaceId!}
                />
              )}

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
                align="end"
                openPopover={openPopover}
                setOpenPopover={setOpenPopover}
              >
                <Button
                  variant="secondary"
                  className={cn(
                    "h-8 px-1 outline-none transition-all duration-200",
                    "border-transparent data-[state=open]:border-gray-500 sm:group-hover/card:data-[state=closed]:border-gray-200",
                  )}
                  icon={<ThreeDots className="h-4 w-4 shrink-0" />}
                />
              </Popover>
            </div>
          )}
        </div>

        <div>
          <span className="flex items-center justify-start gap-1.5 truncate text-sm font-medium text-gray-900">
            <span className="truncate">{folder.name}</span>

            {folder.id === "unsorted" && (
              <div className="rounded bg-gray-100 p-1">
                <div className="text-xs font-normal text-black">Unsorted</div>
              </div>
            )}
          </span>

          <div className="mt-1.5 flex items-center gap-1 text-gray-500">
            <Globe className="size-3.5" />
            <span className="text-sm font-normal">
              {nFormatter(folder.linkCount)} link{folder.linkCount !== 1 && "s"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
