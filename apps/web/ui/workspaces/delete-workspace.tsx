"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useDeleteWorkspaceModal } from "@/ui/modals/delete-workspace-modal";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";

export default function DeleteWorkspace() {
  const { setShowDeleteWorkspaceModal, DeleteWorkspaceModal } =
    useDeleteWorkspaceModal();

  const { isOwner } = useWorkspace();
  return (
    <div
      className={cn("rounded-lg border border-red-600 bg-white", {
        "border-gray-200": !isOwner,
      })}
    >
      <DeleteWorkspaceModal />
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Delete Workspace</h2>
        <p className="text-sm text-gray-500">
          Permanently delete your workspace, custom domain, and all associated
          links + their stats. This action cannot be undone - please proceed
          with caution.
        </p>
      </div>
      <div
        className={cn("border-b border-red-600", {
          "border-gray-200": !isOwner,
        })}
      />

      <div className="flex items-center justify-end px-5 py-4 sm:px-10">
        <div>
          <Button
            text="Delete Workspace"
            variant="danger"
            onClick={() => setShowDeleteWorkspaceModal(true)}
            {...(!isOwner && {
              disabledTooltip: "Only workspace owners can delete a workspace.",
            })}
          />
        </div>
      </div>
    </div>
  );
}
