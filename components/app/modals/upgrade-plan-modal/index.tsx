import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import Modal from "@/components/shared/modal";
import Pricing from "./pricing";

function UpgradePlanModal({
  showUpgradePlanModal,
  setShowUpgradePlanModal,
}: {
  showUpgradePlanModal: boolean;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showUpgradePlanModal}
      setShowModal={setShowUpgradePlanModal}
    >
      <div className="inline-block max-h-[calc(100vh-150px)] w-full max-w-screen-xl transform overflow-scroll bg-white align-middle shadow-xl scrollbar-hide sm:rounded-2xl sm:border sm:border-gray-200">
        <Pricing />
      </div>
    </Modal>
  );
}

export function useUpgradePlanModal() {
  const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);

  const UpgradePlanModalCallback = useCallback(() => {
    return (
      <UpgradePlanModal
        showUpgradePlanModal={showUpgradePlanModal}
        setShowUpgradePlanModal={setShowUpgradePlanModal}
      />
    );
  }, [showUpgradePlanModal, setShowUpgradePlanModal]);

  return useMemo(
    () => ({
      setShowUpgradePlanModal,
      UpgradePlanModal: UpgradePlanModalCallback,
    }),
    [setShowUpgradePlanModal, UpgradePlanModalCallback],
  );
}
