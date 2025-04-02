"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { useDeleteWorkspaceModal } from "@/ui/modals/delete-workspace-modal";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";

export default function DeleteWorkspace() {
  const { setShowDeleteWorkspaceModal, DeleteWorkspaceModal } =
    useDeleteWorkspaceModal();

  const { role } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
  }).error;

  return (
    <div
      className={cn("rounded-lg border border-red-600 bg-white", {
        "border-neutral-200": permissionsError,
      })}
    >
      <DeleteWorkspaceModal />
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Delete Workspace</h2>
        <p className="text-sm text-neutral-500">
          Permanently delete your workspace, custom domain, and all associated
          links + their stats. This action cannot be undone - please proceed
          with caution.
        </p>
      </div>
      <div
        className={cn("border-b border-red-600", {
          "border-neutral-200": permissionsError,
        })}
      />

      <div className="flex items-center justify-end px-5 py-4 sm:px-10">
        <div>
          <Button
            text="Delete Workspace"
            variant="danger"
            onClick={() => setShowDeleteWorkspaceModal(true)}
            disabledTooltip={permissionsError || undefined}
          />
        </div>
      </div>
    </div>
  );
}
