import { rejectBountySubmissionAction } from "@/lib/actions/partners/reject-bounty-submission";
import { mutatePrefix } from "@/lib/swr/mutate";
import useBounty from "@/lib/swr/use-bounty";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import {
  REJECT_BOUNTY_SUBMISSION_REASONS,
  rejectBountySubmissionSchema,
} from "@/lib/zod/schemas/bounties";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = Pick<
  z.infer<typeof rejectBountySubmissionSchema>,
  "rejectionReason" | "rejectionNote"
>;

interface RejectBountySubmissionModalProps {
  submission: BountySubmissionProps;
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const RejectBountySubmissionModal = ({
  submission,
  showModal,
  setShowModal,
}: RejectBountySubmissionModalProps) => {
  const { bounty } = useBounty();
  const workspace = useWorkspace();

  const {
    register,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      rejectionReason: "didNotMeetCriteria",
      rejectionNote: "",
    },
  });

  const { executeAsync: rejectBountySubmission, isPending } = useAction(
    rejectBountySubmissionAction,
    {
      onSuccess: async () => {
        toast.success("Bounty submission rejected successfully!");
        setShowModal(false);
        await mutatePrefix(`/api/bounties/${bounty?.id}/submissions`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

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
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <select
                id="rejectionReason"
                {...register("rejectionReason", { required: true })}
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.rejectionReason &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
              >
                {Object.entries(REJECT_BOUNTY_SUBMISSION_REASONS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
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
              <span className="text-xs text-neutral-400">
                {watch("rejectionNote")?.length || 0}/5,000
              </span>
            </div>
            <div className="mt-2">
              <textarea
                id="rejectionNote"
                {...register("rejectionNote", {
                  maxLength: 5000,
                  setValueAs: (value) => (value === "" ? undefined : value),
                })}
                rows={3}
                maxLength={5000}
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.rejectionNote &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                placeholder="Provide additional context for the rejection..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => setShowModal(false)}
            disabled={isPending}
          />
          <Button
            type="button"
            text="Reject"
            variant="danger"
            className="h-9 w-fit"
            loading={isPending}
            onClick={async () => {
              if (!workspace.id || !submission?.id) {
                return;
              }

              const formData = getValues();

              await rejectBountySubmission({
                ...formData,
                workspaceId: workspace.id,
                submissionId: submission.id,
              });
            }}
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

  const RejectBountySubmissionModalCallback = useCallback(() => {
    return (
      <RejectBountySubmissionModal
        showModal={showRejectModal}
        setShowModal={setShowRejectModal}
        submission={submission}
      />
    );
  }, [showRejectModal, setShowRejectModal, onReject, submission]);

  return useMemo(
    () => ({
      setShowRejectModal,
      RejectBountySubmissionModal: RejectBountySubmissionModalCallback,
    }),
    [setShowRejectModal, RejectBountySubmissionModalCallback],
  );
}
