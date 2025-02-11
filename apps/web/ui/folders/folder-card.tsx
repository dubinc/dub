"use client";

import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder } from "@/lib/types";
import { Globe } from "@dub/ui/icons";
import { nFormatter } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeleteFolderModal } from "../modals/delete-folder-modal";
import { useRenameFolderModal } from "../modals/rename-folder-modal";
import { FolderActions } from "./folder-actions";
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

              <FolderActions folder={folder} />
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
