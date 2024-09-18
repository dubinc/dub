import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AddFolderForm } from "../folders/add-folder-form";

interface AddFolderModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const AddFolderModal = ({ showModal, setShowModal }: AddFolderModalProps) => {
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <AddFolderForm
        onSuccess={() => setShowModal(false)}
        onCancel={() => setShowModal(false)}
      />
    </Modal>
  );
};

function AddFolderButton({
  setShowAddFolderModal,
}: {
  setShowAddFolderModal: Dispatch<SetStateAction<boolean>>;
}) {
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const existingModalBackdrop = document.getElementById("modal-backdrop");

    if (e.key.toLowerCase() === "c" && !existingModalBackdrop) {
      e.preventDefault();
      setShowAddFolderModal(true);
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
      onClick={() => setShowAddFolderModal(true)}
    />
  );
}

export function useAddFolderModal() {
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);

  const AddFolderModalCallback = useCallback(() => {
    return (
      <AddFolderModal
        showModal={showAddFolderModal}
        setShowModal={setShowAddFolderModal}
      />
    );
  }, [showAddFolderModal, setShowAddFolderModal]);

  const AddFolderButtonCallback = useCallback(() => {
    return <AddFolderButton setShowAddFolderModal={setShowAddFolderModal} />;
  }, [setShowAddFolderModal]);

  return useMemo(
    () => ({
      setShowAddFolderModal,
      AddFolderModal: AddFolderModalCallback,
      AddFolderButton: AddFolderButtonCallback,
    }),
    [setShowAddFolderModal, AddFolderModalCallback, AddFolderButtonCallback],
  );
}
