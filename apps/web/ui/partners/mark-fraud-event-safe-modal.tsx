import { markFraudEventSafeAction } from "@/lib/actions/partners/mark-fraud-event-safe";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEvent } from "@/lib/types";
import { FRAUD_EVENT_SAFE_REASONS } from "@/lib/zod/schemas/fraud-events";
import { Button, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function MarkFraudEventSafeModal({
  showModal,
  setShowModal,
  fraudEvent,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  fraudEvent: FraudEvent;
}) {
  const { id: workspaceId } = useWorkspace();
  const [reason, setReason] = useState("");
  const [ignoreFutureFlags, setIgnoreFutureFlags] = useState(false);

  const { executeAsync, isPending } = useAction(markFraudEventSafeAction, {
    onSuccess: async () => {
      toast.success("Fraud event marked as safe!");
      setShowModal(false);
      mutatePrefix("/api/fraud-events");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const handleMarkAsSafe = useCallback(async () => {
    if (!workspaceId || !fraudEvent.id) {
      return;
    }

    await executeAsync({
      workspaceId,
      fraudEventId: fraudEvent.id,
      resolutionReason: reason || undefined,
      ignoreFutureFlags,
    });
  }, [executeAsync, fraudEvent.id, workspaceId, reason]);

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Mark partner as safe
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-900">
              Reason for marking safe (optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
            >
              <option value="">Select</option>
              {Object.keys(FRAUD_EVENT_SAFE_REASONS).map((reason) => (
                <option key={reason} value={reason}>
                  {FRAUD_EVENT_SAFE_REASONS[reason]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              This is for historical records only
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ignoreFutureFlags"
              checked={ignoreFutureFlags}
              onChange={(e) => setIgnoreFutureFlags(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
            />
            <label
              htmlFor="ignoreFutureFlags"
              className="text-sm text-neutral-900"
            >
              Ignore all flags in the future for this partner
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleMarkAsSafe}
          autoFocus
          loading={isPending}
          text="Mark partner as safe"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useMarkFraudEventSafeModal({
  fraudEvent,
}: {
  fraudEvent: FraudEvent;
}) {
  const [showModal, setShowModal] = useState(false);

  const MarkFraudEventSafeModalCallback = useCallback(() => {
    return (
      <MarkFraudEventSafeModal
        showModal={showModal}
        setShowModal={setShowModal}
        fraudEvent={fraudEvent}
      />
    );
  }, [showModal, setShowModal, fraudEvent]);

  return useMemo(
    () => ({
      setShowModal,
      MarkFraudEventSafeModal: MarkFraudEventSafeModalCallback,
    }),
    [setShowModal, MarkFraudEventSafeModalCallback],
  );
}
