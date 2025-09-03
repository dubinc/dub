import { ExpandedLinkProps } from "@/lib/types";
import { Modal } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";
import { MoveLinkForm } from "../folders/move-link-form";

interface MoveLinkToFolderModalProps {
  links: ExpandedLinkProps[];
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onSuccess?: (folderId: string | null) => void;
}

const MoveLinkToFolderModal = ({
  links,
  showModal,
  setShowModal,
  onSuccess,
}: MoveLinkToFolderModalProps) => {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="overflow-y-visible"
    >
      <MoveLinkForm
        links={links}
        onSuccess={(folderId) => {
          setShowModal(false);
          onSuccess?.(folderId);
        }}
        onCancel={() => setShowModal(false)}
      />
    </Modal>
  );
};

export function useMoveLinkToFolderModal(
  props: { onSuccess?: (folderId: string | null) => void } & (
    | {
        link: ExpandedLinkProps;
      }
    | {
        links: ExpandedLinkProps[];
      }
  ),
) {
  const [showMoveLinkToFolderModal, setShowMoveLinkToFolderModal] =
    useState(false);

  const MoveLinkToFolderModalCallback = useCallback(() => {
    return (
      <MoveLinkToFolderModal
        links={"link" in props ? [props.link] : props.links}
        showModal={showMoveLinkToFolderModal}
        setShowModal={setShowMoveLinkToFolderModal}
        onSuccess={props.onSuccess}
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
