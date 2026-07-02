"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { useDeleteWorkspaceModal } from "@/ui/modals/delete-workspace-modal";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";

export default function DeleteWorkspace() {
  const { setShowDeleteWorkspaceModal, DeleteWorkspaceModal } =
    useDeleteWorkspaceModal();

  const { role, environment } = useWorkspace();

  const { error } = clientAccessCheck({
    action: "workspaces.write",
    role,
    environment,
    stagingBehavior: "production-only",
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-red-200 bg-white",
        {
          "border-neutral-200": error,
        },
      )}
    >
      <DeleteWorkspaceModal />
      <div className="flex flex-col space-y-1 p-6">
        <h2 className="text-base font-semibold">Delete Workspace</h2>
        <p className="text-sm text-neutral-500">
          Permanently delete your workspace, custom domain, and all associated
          links + their stats. This action cannot be undone - please proceed
          with caution.
        </p>
      </div>
      <div
        className={cn("border-b border-red-200", {
          "border-neutral-200": error,
        })}
      />

      <div className="flex items-center justify-start bg-red-50 p-3 sm:justify-end">
        <div>
          <Button
            text="Delete Workspace"
            variant="danger"
            onClick={() => setShowDeleteWorkspaceModal(true)}
            disabledTooltip={error || undefined}
          />
        </div>
      </div>
    </div>
  );
}
