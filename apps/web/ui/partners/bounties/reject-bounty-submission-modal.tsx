import {
  BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH,
  REJECT_BOUNTY_SUBMISSION_REASONS,
} from "@/lib/bounty/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { BountySubmissionProps } from "@/lib/types";
import { rejectBountySubmissionBodySchema } from "@/lib/zod/schemas/bounties";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { cn } from "@dub/utils";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

interface RejectBountySubmissionModalProps {
  submission: BountySubmissionProps;
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onReject?: () => void;
}

const RejectBountySubmissionModal = ({
  submission,
  showModal,
  setShowModal,
  onReject,
}: RejectBountySubmissionModalProps) => {
  const { makeRequest: rejectBountySubmission, isSubmitting } =
    useApiMutation();

  const {
    register,
    getValues,
    control,
    formState: { errors },
  } = useForm<z.infer<typeof rejectBountySubmissionBodySchema>>({
    defaultValues: {
      rejectionReason: undefined,
      rejectionNote: "",
    },
  });

  const handleReject = useCallback(async () => {
    if (!submission?.id || !submission.bountyId) {
      return;
    }

    const formData = getValues();

    await rejectBountySubmission(
      `/api/bounties/${submission.bountyId}/submissions/${submission.id}/reject`,
      {
        method: "POST",
        body: {
          rejectionReason: formData.rejectionReason || undefined,
          rejectionNote: formData.rejectionNote,
        },
        onSuccess: async () => {
          toast.success("Bounty submission rejected successfully!");
          setShowModal(false);
          onReject?.();
          await mutatePrefix(
            `/api/bounties/${submission.bountyId}/submissions`,
          );
        },
      },
    );
  }, [
    submission?.id,
    submission.bountyId,
    getValues,
    rejectBountySubmission,
    setShowModal,
    onReject,
  ]);

  // Handle keyboard shortcut for Reject button
  useKeyboardShortcut("r", handleReject, {
    enabled: showModal,
    sheet: true,
    modal: true,
  });

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="truncate text-lg font-medium">Reject bounty</h3>
      </div>

      <div className="bg-neutral-50">
        <div className="flex flex-col gap-6 px-4 py-6 sm:px-6">
          <div>
            <label
              htmlFor="rejectionReason"
              className="text-content-emphasis text-sm font-medium"
            >
              Rejection reason
              <span className="ml-1 font-normal text-neutral-500">
                (optional)
              </span>
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <select
                id="rejectionReason"
                {...register("rejectionReason")}
                disabled={isSubmitting}
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.rejectionReason &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
              >
                <option value="">Select a reason</option>
                {Object.entries(REJECT_BOUNTY_SUBMISSION_REASONS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">
              Included in rejection email
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="rejectionNote"
                className="text-content-emphasis text-sm font-medium"
              >
                Additional details
                <span className="ml-1 font-normal text-neutral-500">
                  (optional)
                </span>
              </label>
              <MaxCharactersCounter
                name="rejectionNote"
                maxLength={BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH}
                control={control}
              />
            </div>
            <div className="mt-2">
              <textarea
                id="rejectionNote"
                {...register("rejectionNote", {
                  maxLength: BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH,
                  setValueAs: (value) => (value === "" ? undefined : value),
                })}
                rows={3}
                maxLength={BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH}
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.rejectionNote &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                placeholder="Provide additional context for the rejection..."
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">
              Included in rejection email
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => setShowModal(false)}
            disabled={isSubmitting}
          />
          <Button
            type="button"
            text="Reject"
            variant="danger"
            shortcut="R"
            className="h-9 w-fit"
            loading={isSubmitting}
            onClick={handleReject}
          />
        </div>
      </div>
    </Modal>
  );
};

export function useRejectBountySubmissionModal(
  submission: BountySubmissionProps,
  onReject?: () => void,
) {
  const [showRejectModal, setShowRejectModal] = useState(false);

  return {
    setShowRejectModal,
    RejectBountySubmissionModal: showRejectModal ? (
      <RejectBountySubmissionModal
        key={submission.id}
        showModal={showRejectModal}
        setShowModal={setShowRejectModal}
        submission={submission}
        onReject={onReject}
      />
    ) : null,
  };
}
