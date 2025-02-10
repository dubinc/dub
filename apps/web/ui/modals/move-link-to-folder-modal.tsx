import { ExpandedLinkProps } from "@/lib/types";
import { Modal } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";
import { MoveLinkForm } from "../folders/move-link-form";

interface MoveLinkToFolderModalProps {
  link: ExpandedLinkProps;
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const MoveLinkToFolderModal = ({
  link,
  showModal,
  setShowModal,
}: MoveLinkToFolderModalProps) => {
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <MoveLinkForm
        link={link}
        onSuccess={() => setShowModal(false)}
        onCancel={() => setShowModal(false)}
      />
    </Modal>
  );
};

export function useMoveLinkToFolderModal({
  link,
}: {
  link: ExpandedLinkProps;
}) {
  const [showMoveLinkToFolderModal, setShowMoveLinkToFolderModal] =
    useState(false);

  const MoveLinkToFolderModalCallback = useCallback(() => {
    return (
      <MoveLinkToFolderModal
        link={link}
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
