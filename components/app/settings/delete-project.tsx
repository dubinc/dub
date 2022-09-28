import { useDeleteProjectModal } from "components/app/modals/delete-project-modal";

export default function DeleteProject() {
  const { setShowDeleteProjectModal, DeleteProjectModal } =
    useDeleteProjectModal();
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <DeleteProjectModal />
      <div className="flex flex-col space-y-3 p-10">
        <h2 className="text-xl font-medium">Delete Project</h2>
        <p className="text-gray-500 text-sm">
          Permanently delete your project, custom domain, and all associated
          links + their stats. This action cannot be undone - please proceed
          with caution.
        </p>
      </div>
      <div className="border-b border-gray-200" />

      <div className="px-10 py-5 flex justify-end items-center">
        <button
          onClick={() => setShowDeleteProjectModal(true)}
          className="bg-red-500 text-white border-red-500 hover:text-red-500 hover:bg-white h-9 w-32 text-sm border rounded-md focus:outline-none transition-all ease-in-out duration-150"
        >
          Delete Project
        </button>
      </div>
    </div>
  );
}
