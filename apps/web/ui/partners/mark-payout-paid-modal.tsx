import { markPayoutPaidAction } from "@/lib/actions/partners/mark-payout-paid";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface MarkPayoutPaidModalProps {
  showMarkPayoutPaidModal: boolean;
  setShowMarkPayoutPaidModal: (show: boolean) => void;
  payout: PayoutResponse;
}

function MarkPayoutPaidModal({
  showMarkPayoutPaidModal,
  setShowMarkPayoutPaidModal,
  payout,
}: MarkPayoutPaidModalProps) {
  return (
    <Modal
      showModal={showMarkPayoutPaidModal}
      setShowModal={setShowMarkPayoutPaidModal}
    >
      <MarkPayoutPaidModalInner
        setShowMarkPayoutPaidModal={setShowMarkPayoutPaidModal}
        payout={payout}
      />
    </Modal>
  );
}

function MarkPayoutPaidModalInner({
  setShowMarkPayoutPaidModal,
  payout,
}: Omit<MarkPayoutPaidModalProps, "showMarkPayoutPaidModal">) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { execute, isExecuting, hasSucceeded } = useAction(
    markPayoutPaidAction,
    {
      onSuccess: () => {
        toast.success("Payout updated successfully!");
        setShowMarkPayoutPaidModal(false);
        mutatePrefix(`/api/programs/${defaultProgramId}/payouts`);
      },
      onError: () => {
        toast.error("Failed to update payout");
      },
    },
  );

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Mark payout as paid
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          Are you sure you want to manually mark this payout as paid? This
          action cannot be undone.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowMarkPayoutPaidModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={() =>
            execute({
              workspaceId: workspaceId!,
              payoutId: payout.id,
            })
          }
          autoFocus
          loading={isExecuting || hasSucceeded}
          text="Mark payout as paid"
          className="h-8 w-fit px-3"
        />
      </div>
    </>
  );
}

export function useMarkPayoutPaidModal(props: { payout: PayoutResponse }) {
  const [showMarkPayoutPaidModal, setShowMarkPayoutPaidModal] = useState(false);

  const MarkPayoutPaidModalCallback = useCallback(() => {
    return (
      <MarkPayoutPaidModal
        showMarkPayoutPaidModal={showMarkPayoutPaidModal}
        setShowMarkPayoutPaidModal={setShowMarkPayoutPaidModal}
        payout={props.payout}
      />
    );
  }, [showMarkPayoutPaidModal, setShowMarkPayoutPaidModal, props.payout]);

  return useMemo(
    () => ({
      setShowMarkPayoutPaidModal,
      MarkPayoutPaidModal: MarkPayoutPaidModalCallback,
    }),
    [setShowMarkPayoutPaidModal, MarkPayoutPaidModalCallback],
  );
}
