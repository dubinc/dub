"use client";

import { approveBountySubmissionAction } from "@/lib/actions/partners/approve-bounty-submission";
import {
  calculateSocialMetricsRewardAmount,
  resolveBountyDetails,
} from "@/lib/bounty/utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps, BountySubmissionProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { currencyFormatter, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ConfirmApproveBountySubmissionModalProps = {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  submission: BountySubmissionProps;
  bounty: BountyProps | null;
  rewardAmount: number | null;
  onApproveSuccess?: () => void;
};

function ConfirmApproveBountySubmissionModal({
  showModal,
  setShowModal,
  submission,
  bounty,
  rewardAmount,
  onApproveSuccess,
}: ConfirmApproveBountySubmissionModalProps) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: approveBountySubmission, isPending } = useAction(
    approveBountySubmissionAction,
    {
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Bounty submission approved successfully!");
        if (bounty?.id) {
          await mutatePrefix(`/api/bounties/${bounty.id}/submissions`);
        }
        onApproveSuccess?.();
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const commissionAmountCents = useMemo(() => {
    const bountyInfo = bounty ? resolveBountyDetails(bounty) : null;
    if (bountyInfo?.hasSocialMetrics && bounty) {
      return calculateSocialMetricsRewardAmount({ bounty, submission });
    }
    if (bounty?.rewardAmount != null) {
      return bounty.rewardAmount;
    }
    if (rewardAmount != null) {
      return rewardAmount * 100;
    }
    return null;
  }, [bounty, submission, rewardAmount]);

  const handleApprove = async () => {
    if (!workspaceId || !submission?.id) return;
    await approveBountySubmission({
      workspaceId,
      submissionId: submission.id,
      rewardAmount: rewardAmount != null ? rewardAmount * 100 : null,
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-content-emphasis text-lg font-medium">
          Approve bounty submission
        </h3>
        <p className="text-content-subtle text-sm">
          This will create a{" "}
          <span className="font-semibold text-neutral-900">
            {currencyFormatter(commissionAmountCents ?? 0, {
              trailingZeroDisplay: "stripIfInteger",
            })}
          </span>{" "}
          commission for{" "}
          <span className="font-semibold text-neutral-900">
            {submission.partner.name}
          </span>
          .
        </p>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
          <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white p-5">
            <div
              className="pointer-events-none absolute inset-0 bg-neutral-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <img
                  src={
                    submission.partner.image ||
                    `${OG_AVATAR_URL}${submission.partner.id}`
                  }
                  alt={submission.partner.name}
                  className="size-10 shrink-0 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-neutral-800">
                    {submission.partner.name}
                  </div>
                  <div className="truncate text-sm font-medium text-neutral-500">
                    {submission.partner.email}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-content-emphasis text-xl font-semibold">
                  {currencyFormatter(commissionAmountCents ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isPending}
            />
            <Button
              type="button"
              variant="primary"
              text="Approve"
              className="h-8 w-fit"
              loading={isPending}
              onClick={handleApprove}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function useConfirmApproveBountySubmissionModal(options?: {
  onApproveSuccess?: () => void;
}) {
  const [state, setState] = useState<{
    submission: BountySubmissionProps;
    bounty: BountyProps | null;
    rewardAmount: number | null;
  } | null>(null);

  function openConfirmApproveBountySubmissionModal(
    submission: BountySubmissionProps,
    bounty: BountyProps | null,
    rewardAmount: number | null,
  ) {
    setState({ submission, bounty, rewardAmount });
  }

  function closeConfirmApproveBountySubmissionModal() {
    setState(null);
  }

  function ConfirmApproveBountySubmissionModalWrapper() {
    if (!state) return null;

    return (
      <ConfirmApproveBountySubmissionModal
        submission={state.submission}
        bounty={state.bounty}
        rewardAmount={state.rewardAmount}
        showModal
        setShowModal={(show) => {
          if (!show) closeConfirmApproveBountySubmissionModal();
        }}
        onApproveSuccess={options?.onApproveSuccess}
      />
    );
  }

  return {
    openConfirmApproveBountySubmissionModal,
    closeConfirmApproveBountySubmissionModal,
    ConfirmApproveBountySubmissionModal:
      ConfirmApproveBountySubmissionModalWrapper,
    isConfirmApproveBountySubmissionModalOpen: state !== null,
  };
}
