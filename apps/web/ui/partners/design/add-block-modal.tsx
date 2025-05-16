"use client";

import { Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type AddBlockModalProps = {
  showAddBlockModal: boolean;
  setShowAddBlockModal: Dispatch<SetStateAction<boolean>>;
};

function AddBlockModal(props: AddBlockModalProps) {
  return (
    <Modal
      showModal={props.showAddBlockModal}
      setShowModal={props.setShowAddBlockModal}
    >
      <AddBlockModalInner {...props} />
    </Modal>
  );
}

function AddBlockModalInner({ setShowAddBlockModal }: AddBlockModalProps) {
  return (
    <>
      <div className="flex items-center justify-center py-8 text-xs text-neutral-500">
        WIP
      </div>
    </>
  );
}

export function useAddBlockModal() {
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  const AddBlockModalCallback = useCallback(() => {
    return (
      <AddBlockModal
        showAddBlockModal={showAddBlockModal}
        setShowAddBlockModal={setShowAddBlockModal}
      />
    );
  }, [showAddBlockModal, setShowAddBlockModal]);

  return useMemo(
    () => ({
      setShowAddBlockModal,
      AddBlockModal: AddBlockModalCallback,
    }),
    [setShowAddBlockModal, AddBlockModalCallback],
  );
}
