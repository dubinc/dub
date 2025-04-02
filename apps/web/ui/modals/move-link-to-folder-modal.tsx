import { ExpandedLinkProps } from "@/lib/types";
import { Modal } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";
import { MoveLinkForm } from "../folders/move-link-form";

interface MoveLinkToFolderModalProps {
  links: ExpandedLinkProps[];
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const MoveLinkToFolderModal = ({
  links,
  showModal,
  setShowModal,
}: MoveLinkToFolderModalProps) => {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="overflow-y-visible"
    >
      <MoveLinkForm
        links={links}
        onSuccess={() => setShowModal(false)}
        onCancel={() => setShowModal(false)}
      />
    </Modal>
  );
};

export function useMoveLinkToFolderModal(
  props:
    | {
        link: ExpandedLinkProps;
      }
    | {
        links: ExpandedLinkProps[];
      },
) {
  const [showMoveLinkToFolderModal, setShowMoveLinkToFolderModal] =
    useState(false);

  const MoveLinkToFolderModalCallback = useCallback(() => {
    return (
      <MoveLinkToFolderModal
        links={"link" in props ? [props.link] : props.links}
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
