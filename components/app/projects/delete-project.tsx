import useProject from "#/lib/swr/use-project";
import { cn } from "#/lib/utils";
import Button from "#/ui/button";
import { useDeleteProjectModal } from "components/app/modals/delete-project-modal";

export default function DeleteProject() {
  const { setShowDeleteProjectModal, DeleteProjectModal } =
    useDeleteProjectModal();

  const { plan, isOwner } = useProject();
  return (
    <div
      className={cn("rounded-lg border border-red-600 bg-white", {
        "border-gray-200": plan === "enterprise" && !isOwner,
      })}
    >
      <DeleteProjectModal />
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Delete Project</h2>
        <p className="text-sm text-gray-500">
          Permanently delete your project, custom domain, and all associated
          links + their stats. This action cannot be undone - please proceed
          with caution.
        </p>
      </div>
      <div
        className={cn("border-b border-red-600", {
          "border-gray-200": plan === "enterprise" && !isOwner,
        })}
      />

      <div className="flex items-center justify-end px-5 py-4 sm:px-10">
        <div>
          <Button
            text="Delete Project"
            variant="danger"
            onClick={() => setShowDeleteProjectModal(true)}
            {...(plan === "enterprise" &&
              !isOwner && {
                disabledTooltip: "Only project owners can delete a project.",
              })}
          />
        </div>
      </div>
    </div>
  );
}
