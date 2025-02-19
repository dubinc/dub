import useWorkspace from "@/lib/swr/use-workspace";
import { Folder } from "@dub/prisma/client";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface DeleteFolderModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  folder: Pick<Folder, "id" | "name">;
  onDelete?: () => void;
}

const DeleteFolderModal = ({
  showModal,
  setShowModal,
  folder,
  onDelete,
}: DeleteFolderModalProps) => {
  const workspace = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [isDeleting, setIsDeleting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDeleting(true);

    const response = await fetch(
      `/api/folders/${folder.id}?workspaceId=${workspace.id}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setIsDeleting(false);
      return;
    }

    Promise.all([
      mutate(`/api/folders?workspaceId=${workspace.id}`),
      mutate(`/api/folder/permissions?workspaceId=${workspace.id}`),
    ]);

    setShowModal(false);
    onDelete?.();
    toast.success("Folder deleted successfully!");
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Delete {folder.name}</h3>
        <p className="text-sm text-neutral-500">
          All links within this folder will return to the main folder and will
          not be deleted.{" "}
          <strong className="font-semibold text-neutral-700">
            This action cannot be undone
          </strong>{" "}
          - proceed with caution.
        </p>
      </div>

      <div className="bg-neutral-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-6 px-4 text-left sm:px-6">
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <p className="block text-sm text-neutral-500">
                  To verify, type{" "}
                  <span className="font-medium text-neutral-700">
                    {folder.name}
                  </span>{" "}
                  below
                </p>
              </div>

              <div className="mt-2">
                <div className="-m-1 rounded-[0.625rem] p-1">
                  <div className="flex rounded-md border border-neutral-300 bg-white">
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      className="block w-full rounded-md border-0 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                      aria-invalid="true"
                      autoFocus={!isMobile}
                      pattern={folder.name}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isDeleting}
            />
            <Button
              type="submit"
              text="Confirm delete"
              variant="danger"
              loading={isDeleting}
              className="h-9 w-fit"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export function useDeleteFolderModal(
  folder: Pick<Folder, "id" | "name">,
  onDelete?: () => void,
) {
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);

  const DeleteFolderModalCallback = useCallback(() => {
    return (
      <DeleteFolderModal
        showModal={showDeleteFolderModal}
        setShowModal={setShowDeleteFolderModal}
        folder={folder}
        onDelete={onDelete}
      />
    );
  }, [showDeleteFolderModal, setShowDeleteFolderModal, onDelete]);

  return useMemo(
    () => ({
      setShowDeleteFolderModal,
      DeleteFolderModal: DeleteFolderModalCallback,
    }),
    [setShowDeleteFolderModal, DeleteFolderModalCallback],
  );
}
