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
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Insert block
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-48 rounded-md bg-neutral-100" />
          ))}

          <div className="col-span-2 h-20 rounded-md bg-neutral-100" />
        </div>
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
