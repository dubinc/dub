import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CreateFolderForm } from "../folders/create-folder-form";

interface CreateFolderModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const CreateFolderModal = ({
  showModal,
  setShowModal,
}: CreateFolderModalProps) => {
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <h3 className="border-b border-gray-200 px-4 py-4 text-lg font-medium sm:px-6">
        Create new folder
      </h3>
      <div className="mt-6">
        <CreateFolderForm
          onSuccess={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
        />
      </div>
    </Modal>
  );
};

function AddFolderButton({
  setShowCreateFolderModal,
}: {
  setShowCreateFolderModal: Dispatch<SetStateAction<boolean>>;
}) {
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const existingModalBackdrop = document.getElementById("modal-backdrop");

    if (e.key.toLowerCase() === "c" && !existingModalBackdrop) {
      e.preventDefault();
      setShowCreateFolderModal(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <Button
      text="Create folder"
      shortcut="C"
      onClick={() => setShowCreateFolderModal(true)}
    />
  );
}

export function useCreateFolderModal() {
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  const CreateFolderModalCallback = useCallback(() => {
    return (
      <CreateFolderModal
        showModal={showCreateFolderModal}
        setShowModal={setShowCreateFolderModal}
      />
    );
  }, [showCreateFolderModal, setShowCreateFolderModal]);

  const AddFolderButtonCallback = useCallback(() => {
    return (
      <AddFolderButton setShowCreateFolderModal={setShowCreateFolderModal} />
    );
  }, [setShowCreateFolderModal]);

  return useMemo(
    () => ({
      setShowCreateFolderModal,
      CreateFolderModal: CreateFolderModalCallback,
      AddFolderButton: AddFolderButtonCallback,
    }),
    [
      setShowCreateFolderModal,
      CreateFolderModalCallback,
      AddFolderButtonCallback,
    ],
  );
}
