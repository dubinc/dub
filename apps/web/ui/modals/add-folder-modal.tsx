import { FolderSummary } from "@/lib/types";
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
  onSuccess?: (folder: FolderSummary) => void;
}

const AddFolderModal = ({
  showModal,
  setShowModal,
  onSuccess,
}: AddFolderModalProps) => {
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <AddFolderForm
        onSuccess={(folder) => {
          onSuccess?.(folder);
          setShowModal(false);
        }}
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
      className="h-9 w-fit rounded-lg"
    />
  );
}

export function useAddFolderModal({
  onSuccess,
}: { onSuccess?: (folder: FolderSummary) => void } = {}) {
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);

  const AddFolderModalCallback = useCallback(() => {
    return (
      <AddFolderModal
        showModal={showAddFolderModal}
        setShowModal={setShowAddFolderModal}
        onSuccess={onSuccess}
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
