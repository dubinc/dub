import { Modal } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";

interface MoveLinkToFolderModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const MoveLinkToFolderModal = ({
  showModal,
  setShowModal,
}: MoveLinkToFolderModalProps) => {
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <>{/* Form goes here */}</>
    </Modal>
  );
};

export function useMoveLinkToFolderModal() {
  const [showMoveLinkToFolderModal, setShowMoveLinkToFolderModal] =
    useState(false);

  const MoveLinkToFolderModalCallback = useCallback(() => {
    return (
      <MoveLinkToFolderModal
        showModal={showMoveLinkToFolderModal}
        setShowModal={setShowMoveLinkToFolderModal}
      />
    );
  }, [showMoveLinkToFolderModal, setShowMoveLinkToFolderModal]);

  return useMemo(
    () => ({
      setShowMoveLinkToFolderModal,
      MoveLinkToFolderModal: MoveLinkToFolderModalCallback,
    }),
    [setShowMoveLinkToFolderModal, MoveLinkToFolderModalCallback],
  );
}
