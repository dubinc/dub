import { markPayoutPaidAction } from "@/lib/actions/partners/mark-payout-paid";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface MarkAsPaidModalProps {
  showMarkAsPaidModal: boolean;
  setShowMarkAsPaidModal: (show: boolean) => void;
  payout: PayoutResponse;
}

function MarkAsPaidModal({
  showMarkAsPaidModal,
  setShowMarkAsPaidModal,
  payout,
}: MarkAsPaidModalProps) {
  return (
    <Modal
      showModal={showMarkAsPaidModal}
      setShowModal={setShowMarkAsPaidModal}
    >
      <MarkAsPaidModalInner
        setShowMarkAsPaidModal={setShowMarkAsPaidModal}
        payout={payout}
      />
    </Modal>
  );
}

function MarkAsPaidModalInner({
  setShowMarkAsPaidModal,
  payout,
}: Omit<MarkAsPaidModalProps, "showMarkAsPaidModal">) {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams();

  const { execute, isExecuting, hasSucceeded } = useAction(
    markPayoutPaidAction,
    {
      onSuccess: () => {
        toast.success("Payout updated successfully!");
        setShowMarkAsPaidModal(false);
        mutatePrefix(`/api/programs/${programId}/payouts`);
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
          onClick={() => setShowMarkAsPaidModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={() =>
            execute({
              workspaceId: workspaceId!,
              programId: programId as string,
              payoutId: payout.id,
            })
          }
          autoFocus
          loading={isExecuting || hasSucceeded}
          text="Mark as paid"
          className="h-8 w-fit px-3"
        />
      </div>
    </>
  );
}

export function useMarkAsPaidModal(props: { payout: PayoutResponse }) {
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);

  const MarkAsPaidModalCallback = useCallback(() => {
    return (
      <MarkAsPaidModal
        showMarkAsPaidModal={showMarkAsPaidModal}
        setShowMarkAsPaidModal={setShowMarkAsPaidModal}
        payout={props.payout}
      />
    );
  }, [showMarkAsPaidModal, setShowMarkAsPaidModal, props.payout]);

  return useMemo(
    () => ({
      setShowMarkAsPaidModal,
      MarkAsPaidModal: MarkAsPaidModalCallback,
    }),
    [setShowMarkAsPaidModal, MarkAsPaidModalCallback],
  );
}
