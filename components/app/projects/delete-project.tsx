import Button from "#/ui/button";
import { useDeleteProjectModal } from "components/app/modals/delete-project-modal";

export default function DeleteProject() {
  const { setShowDeleteProjectModal, DeleteProjectModal } =
    useDeleteProjectModal();
  return (
    <div className="rounded-lg border border-red-600 bg-white">
      <DeleteProjectModal />
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Delete Project</h2>
        <p className="text-sm text-gray-500">
          Permanently delete your project, custom domain, and all associated
          links + their stats. This action cannot be undone - please proceed
          with caution.
        </p>
      </div>
      <div className="border-b border-red-600" />

      <div className="flex items-center justify-end px-5 py-4 sm:px-10">
        <div>
          <Button
            text="Delete Project"
            variant="danger"
            onClick={() => setShowDeleteProjectModal(true)}
          />
        </div>
      </div>
    </div>
  );
}
