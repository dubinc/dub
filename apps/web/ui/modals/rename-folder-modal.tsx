import { Folder } from "@dub/prisma/client";
import { Modal } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";
import { RenameFolderForm } from "../folders/rename-folder-form";

interface RenameFolderModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  folder: Pick<Folder, "id" | "name">;
}

const RenameFolderModal = ({
  showModal,
  setShowModal,
  folder,
}: RenameFolderModalProps) => {
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <h3 className="border-b border-neutral-200 px-4 py-4 text-lg font-medium sm:px-6">
        Rename folder
      </h3>
      <div>
        <RenameFolderForm
          onSuccess={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
          folder={folder}
        />
      </div>
    </Modal>
  );
};

export function useRenameFolderModal(folder: Pick<Folder, "id" | "name">) {
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);

  const RenameFolderModalCallback = useCallback(() => {
    return (
      <RenameFolderModal
        showModal={showRenameFolderModal}
        setShowModal={setShowRenameFolderModal}
        folder={folder}
      />
    );
  }, [showRenameFolderModal, setShowRenameFolderModal]);

  return useMemo(
    () => ({
      setShowRenameFolderModal,
      RenameFolderModal: RenameFolderModalCallback,
    }),
    [setShowRenameFolderModal, RenameFolderModalCallback],
  );
}
