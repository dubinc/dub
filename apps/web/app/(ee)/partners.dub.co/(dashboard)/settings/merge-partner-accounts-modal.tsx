"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface MergePartnerAccountsModalProps {
  showMergePartnerAccountsModal: boolean;
  setShowMergePartnerAccountsModal: Dispatch<SetStateAction<boolean>>;
}

function MergePartnerAccountsModal(props: MergePartnerAccountsModalProps) {
  const { showMergePartnerAccountsModal, setShowMergePartnerAccountsModal } =
    props;

  return (
    <Modal
      showModal={showMergePartnerAccountsModal}
      setShowModal={setShowMergePartnerAccountsModal}
    >
      <MergePartnerAccountsModalInner {...props} />
    </Modal>
  );
}

function MergePartnerAccountsModalInner({
  setShowMergePartnerAccountsModal,
}: MergePartnerAccountsModalProps) {
  const [isPending, setIsPending] = useState(false);

  const handleMerge = async () => {
    setIsPending(true);
    try {
      // TODO: Add merge partner accounts action
      // await mergePartnerAccountsAction();

      toast.success("Partner accounts merged successfully!");
      setShowMergePartnerAccountsModal(false);
      mutatePrefix("/api/partner-profile");
    } catch (error) {
      toast.error("Failed to merge partner accounts");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <div className="space-y-4 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Merge Partner Accounts
        </h3>
        <p className="text-sm font-normal text-neutral-600">
          Merge multiple partner accounts into a single account.
        </p>
      </div>

      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
        {/* Empty body as requested */}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          text="Cancel"
          disabled={isPending}
          className="h-8 w-fit px-3"
          onClick={() => setShowMergePartnerAccountsModal(false)}
        />

        <Button
          text="Merge Accounts"
          className="h-8 w-fit px-3"
          loading={isPending}
          onClick={handleMerge}
        />
      </div>
    </div>
  );
}

export function useMergePartnerAccountsModal() {
  const [showMergePartnerAccountsModal, setShowMergePartnerAccountsModal] =
    useState(false);

  const MergePartnerAccountsModalCallback = useCallback(() => {
    return (
      <MergePartnerAccountsModal
        showMergePartnerAccountsModal={showMergePartnerAccountsModal}
        setShowMergePartnerAccountsModal={setShowMergePartnerAccountsModal}
      />
    );
  }, [showMergePartnerAccountsModal, setShowMergePartnerAccountsModal]);

  return useMemo(
    () => ({
      setShowMergePartnerAccountsModal,
      MergePartnerAccountsModal: MergePartnerAccountsModalCallback,
    }),
    [setShowMergePartnerAccountsModal, MergePartnerAccountsModalCallback],
  );
}
