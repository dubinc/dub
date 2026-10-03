"use client";

import { groupSocialMetricsMilestones } from "@/lib/bounty/social-metrics-milestones";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { BountyProps, BountySubmissionProps } from "@/lib/types";
import { useSocialMetricsMilestones } from "@/ui/partners/bounties/use-social-metrics-milestones";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, Modal } from "@dub/ui";
import { currencyFormatter, nFormatter, pluralize } from "@dub/utils";
import { useState } from "react";
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
  const { makeRequest: approveBountySubmission, isSubmitting } =
    useApiMutation();

  const {
    metric,
    pendingMilestones,
    pendingRewardAmount,
    completesEarningCap,
  } = useSocialMetricsMilestones({ bounty, submission });

  let commissionAmountCents: number | null = null;

  if (metric) {
    commissionAmountCents = pendingRewardAmount;
  } else if (bounty?.rewardAmount != null) {
    commissionAmountCents = bounty.rewardAmount;
  } else if (rewardAmount != null) {
    commissionAmountCents = rewardAmount * 100;
  }

  const handleApprove = async () => {
    if (!submission?.id || !submission.bountyId) return;

    await approveBountySubmission(
      `/api/bounties/${submission.bountyId}/submissions/${submission.id}/approve`,
      {
        method: "POST",
        body: {
          rewardAmount: rewardAmount != null ? rewardAmount * 100 : null,
        },
        onSuccess: async () => {
          setShowModal(false);
          toast.success(
            metric && !completesEarningCap
              ? "Bounty milestones approved successfully!"
              : "Bounty submission approved successfully!",
          );
          await mutatePrefix(
            `/api/bounties/${submission.bountyId}/submissions`,
          );
          onApproveSuccess?.();
        },
      },
    );
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-content-emphasis text-lg font-medium">
          {metric ? "Approve bounty milestones" : "Approve bounty submission"}
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
          </span>{" "}
          {metric ? (
            <>
              across {pendingMilestones.length}{" "}
              {pluralize("milestone", pendingMilestones.length)}.{" "}
              {completesEarningCap
                ? "The partner has reached the maximum reward, so the submission will be marked as approved and they'll be notified by email."
                : "The submission will stay pending so the partner can keep earning future milestones."}
            </>
          ) : (
            "and notify them by email."
          )}
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
                <PartnerAvatar
                  partner={submission.partner}
                  className="size-10"
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

          {metric && pendingMilestones.length > 0 && (
            <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
              {groupSocialMetricsMilestones(pendingMilestones).map((group) => (
                <div
                  key={group.threshold}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-content-default">
                      {nFormatter(group.fromThreshold, { full: true })} to{" "}
                      {nFormatter(group.threshold, { full: true })} {metric}
                    </span>
                    {group.count > 1 && (
                      <span className="text-content-subtle text-xs">
                        {group.count} milestones ×{" "}
                        {currencyFormatter(group.rewardAmount, {
                          trailingZeroDisplay: "stripIfInteger",
                        })}
                      </span>
                    )}
                  </div>
                  <span className="text-content-emphasis shrink-0 font-medium">
                    {currencyFormatter(group.totalRewardAmount, {
                      trailingZeroDisplay: "stripIfInteger",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="primary"
              text="Approve"
              className="h-8 w-fit"
              loading={isSubmitting}
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

  return {
    openConfirmApproveBountySubmissionModal,
    closeConfirmApproveBountySubmissionModal,
    ConfirmApproveBountySubmissionModal: state ? (
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
    ) : null,
    isConfirmApproveBountySubmissionModalOpen: state !== null,
  };
}
