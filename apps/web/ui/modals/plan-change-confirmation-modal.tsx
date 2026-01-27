"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import Link from "next/link";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

function PlanChangeConfirmationModal({
  showPlanChangeConfirmationModal,
  setShowPlanChangeConfirmationModal,
  onConfirm,
}: {
  showPlanChangeConfirmationModal: boolean;
  setShowPlanChangeConfirmationModal: Dispatch<SetStateAction<boolean>>;
  onConfirm: () => void | Promise<void>;
}) {
  const { slug } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Modal
      showModal={showPlanChangeConfirmationModal}
      setShowModal={setShowPlanChangeConfirmationModal}
      className="max-w-md"
    >
      <div className="border-b border-neutral-200 px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="text-lg font-medium">Plan change confirmation</h3>
      </div>

      <div className="flex flex-col gap-4 bg-neutral-50 p-4 sm:p-6">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <TriangleWarning className="size-5 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            Your partner program will be deactivated after this change.
          </p>
        </div>

        <div className="space-y-3 text-sm text-neutral-600">
          <p>
            Ensure any outstanding commissions and payouts are resolved before
            changing your plan.
          </p>

          <p>
            Once the program is deactivated, you will lose access to your
            partner program until you upgrade again.
          </p>

          <p>
            All partner links will stop tracking new activity, and partners will
            be notified automatically.
          </p>
        </div>

        <p className="text-sm text-neutral-600">
          View{" "}
          <Link
            href={`/${slug}/program/payouts?status=pending`}
            className="font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
          >
            pending payouts
          </Link>
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Cancel"
          onClick={() => setShowPlanChangeConfirmationModal(false)}
        />
        <Button
          variant="primary"
          className="h-8 w-fit px-3"
          text="Continue"
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={async () => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            setShowPlanChangeConfirmationModal(false);
            await onConfirm();
            setIsSubmitting(false);
          }}
        />
      </div>
    </Modal>
  );
}

export function usePlanChangeConfirmationModal({
  onConfirm,
}: {
  onConfirm: () => void | Promise<void>;
}) {
  const [
    showPlanChangeConfirmationModal,
    setShowPlanChangeConfirmationModal,
  ] = useState(false);

  // Use ref to avoid re-renders when parent state changes
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const PlanChangeConfirmationModalCallback = useCallback(() => {
    return (
      <PlanChangeConfirmationModal
        showPlanChangeConfirmationModal={showPlanChangeConfirmationModal}
        setShowPlanChangeConfirmationModal={setShowPlanChangeConfirmationModal}
        onConfirm={() => onConfirmRef.current()}
      />
    );
  }, [showPlanChangeConfirmationModal]);

  return useMemo(
    () => ({
      setShowPlanChangeConfirmationModal,
      PlanChangeConfirmationModal: PlanChangeConfirmationModalCallback,
    }),
    [setShowPlanChangeConfirmationModal, PlanChangeConfirmationModalCallback],
  );
}
