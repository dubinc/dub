import useWorkspace from "@/lib/swr/use-workspace";
import { Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

function ManageUsageModal({
  showManageUsageModal,
  setShowManageUsageModal,
}: {
  showManageUsageModal: boolean;
  setShowManageUsageModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();

  return (
    <Modal
      showModal={showManageUsageModal}
      setShowModal={setShowManageUsageModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Manage usage</h3>
      </div>
    </Modal>
  );
}

export function useManageUsageModal() {
  const [showManageUsageModal, setShowManageUsageModal] = useState(false);

  const ManageUsageModalCallback = useCallback(() => {
    return (
      <ManageUsageModal
        showManageUsageModal={showManageUsageModal}
        setShowManageUsageModal={setShowManageUsageModal}
      />
    );
  }, [showManageUsageModal, setShowManageUsageModal]);

  return useMemo(
    () => ({
      setShowManageUsageModal,
      ManageUsageModal: ManageUsageModalCallback,
    }),
    [setShowManageUsageModal, ManageUsageModalCallback],
  );
}
