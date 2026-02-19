"use client";

import { approveBountySubmissionAction } from "@/lib/actions/partners/approve-bounty-submission";
import { REJECT_BOUNTY_SUBMISSION_REASONS } from "@/lib/bounty/constants";
import { getBountySocialMetricsRequirements } from "@/lib/bounty/utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useBounty from "@/lib/swr/use-bounty";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { BountySocialContentPreview } from "@/ui/partners/bounties/bounty-social-content-preview";
import { useRejectBountySubmissionModal } from "@/ui/partners/bounties/reject-bounty-submission-modal";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { AmountInput } from "@/ui/shared/amount-input";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  CopyButton,
  Sheet,
  StatusBadge,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import {
  currencyFormatter,
  formatDate,
  getPrettyUrl,
  OG_AVATAR_URL,
  timeAgo,
} from "@dub/utils";
import Linkify from "linkify-react";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "./bounty-submission-status-badges";

type BountySubmissionDetailsSheetProps = {
  submission: BountySubmissionProps;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function BountySubmissionDetailsSheetContent({
  submission,
  onPrevious,
  onNext,
  setIsOpen,
}: BountySubmissionDetailsSheetProps) {
  const { bounty } = useBounty();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { setShowRejectModal, RejectBountySubmissionModal } =
    useRejectBountySubmissionModal(submission, onNext);

  const [rewardAmount, setRewardAmount] = useState<number | null>(null);

  const { isSubmitting: isRefreshingSocialMetrics, makeRequest } =
    useApiMutation();

  const refreshSubmissionSocialMetrics = useCallback(() => {
    if (!bounty?.id || !submission?.id) return;

    makeRequest(`/api/bounties/${bounty.id}/sync-social-metrics`, {
      method: "POST",
      body: { submissionId: submission.id },
      onSuccess: async () => {
        await mutatePrefix(`/api/bounties/${bounty.id}/submissions`);
        toast.success("Social content stats updated successfully.");
      },

      onError: (error) => {
        toast.error(error);
      },
    });
  }, [bounty?.id, submission?.id, makeRequest]);

  const {
    executeAsync: approveBountySubmission,
    isPending: isApprovingBountySubmission,
  } = useAction(approveBountySubmissionAction, {
    onSuccess: () => {
      toast.success("Bounty submission approved successfully!");
      onNext ? onNext() : setIsOpen(false);
      mutatePrefix(`/api/bounties/${bounty?.id}/submissions`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const {
    setShowConfirmModal: setShowApproveBountySubmissionModal,
    confirmModal: approveBountySubmissionModal,
  } = useConfirmModal({
    title: "Approve Bounty Submission",
    description: "Are you sure you want to approve this bounty submission?",
    confirmText: "Approve",
    confirmShortcut: "a",
    confirmShortcutOptions: { sheet: true, modal: true },
    onConfirm: async () => {
      if (!workspaceId || !submission?.id) {
        return;
      }

      await approveBountySubmission({
        workspaceId,
        submissionId: submission.id,
        rewardAmount: rewardAmount ? rewardAmount * 100 : null,
      });
    },
  });

  // right arrow key onNext
  useKeyboardShortcut(
    "ArrowRight",
    () => {
      if (onNext) {
        onNext();
      }
    },
    { sheet: true },
  );

  // left arrow key onPrevious
  useKeyboardShortcut(
    "ArrowLeft",
    () => {
      if (onPrevious) {
        onPrevious();
      }
    },
    { sheet: true },
  );

  useKeyboardShortcut(
    "a",
    () => {
      if (isValidForm && submission.status !== "draft") {
        setShowApproveBountySubmissionModal(true);
      }
    },
    { sheet: true },
  );

  useKeyboardShortcut(
    "r",
    () => {
      if (submission.status !== "draft" && submission.status !== "rejected") {
        setShowRejectModal(true);
      }
    },
    { sheet: true },
  );

  const isValidForm = useMemo(() => {
    if (bounty?.rewardAmount) {
      return true;
    }

    if (!rewardAmount) {
      return false;
    }

    return true;
  }, [bounty, rewardAmount]);

  if (!submission || !submission.partner || !bounty) {
    return null;
  }

  const socialMetricsRequirements = getBountySocialMetricsRequirements(bounty);

  const hasSocialContent =
    socialMetricsRequirements && (submission.urls?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Review bounty submission
          </Sheet.Title>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Button
                type="button"
                disabled={!onPrevious}
                onClick={onPrevious}
                variant="secondary"
                className="size-9 rounded-l-lg rounded-r-none p-0"
                icon={<ChevronLeft className="size-3.5" />}
              />
              <Button
                type="button"
                disabled={!onNext}
                onClick={onNext}
                variant="secondary"
                className="-ml-px size-9 rounded-l-none rounded-r-lg p-0"
                icon={<ChevronRight className="size-3.5" />}
              />
            </div>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>
      </div>

      <div className="flex grow flex-col">
        <div className="px-6 pt-6">
          <div className="flex items-center gap-4 rounded-xl bg-neutral-100 px-4 py-3">
            <img
              src={
                submission.partner.image ||
                `${OG_AVATAR_URL}${submission.partner.id}`
              }
              alt={submission.partner.name}
              className="size-10 shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-neutral-800">
                {submission.partner.name}
              </div>
              <div className="text-sm font-medium text-neutral-500">
                {submission.partner.email}
              </div>
            </div>
            <ButtonLink
              href={`/${workspaceSlug}/program/partners/${submission.partner.id}`}
              variant="secondary"
              className="h-8 shrink-0 px-3 text-sm font-medium"
              target="_blank"
            >
              View
            </ButtonLink>
          </div>
        </div>

        <div className="flex grow flex-col gap-6 overflow-y-auto p-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Details
            </h2>

            <div className="mt-3 max-w-md space-y-2">
              {[
                {
                  label: "Status",
                  value: (
                    <StatusBadge
                      variant={
                        BOUNTY_SUBMISSION_STATUS_BADGES[submission.status]
                          .variant
                      }
                      icon={
                        BOUNTY_SUBMISSION_STATUS_BADGES[submission.status].icon
                      }
                    >
                      {BOUNTY_SUBMISSION_STATUS_BADGES[submission.status].label}
                    </StatusBadge>
                  ),
                },
                {
                  label:
                    bounty?.type === "performance" ? "Completed" : "Submitted",
                  value: submission.completedAt
                    ? formatDate(submission.completedAt, {
                        month: "short",
                      })
                    : "-",
                },
                ...(socialMetricsRequirements
                  ? [
                      {
                        label: "Criteria",
                        value:
                          socialMetricsRequirements.minCount != null
                            ? `${socialMetricsRequirements.minCount} ${socialMetricsRequirements.metric}`
                            : socialMetricsRequirements.metric,
                      },
                    ]
                  : []),
                ...(submission.status === "rejected"
                  ? [
                      {
                        label: "Rejection reason",
                        value:
                          submission.rejectionReason &&
                          REJECT_BOUNTY_SUBMISSION_REASONS[
                            submission.rejectionReason as keyof typeof REJECT_BOUNTY_SUBMISSION_REASONS
                          ],
                      },
                    ]
                  : [
                      {
                        label: "Reward",
                        value: submission.commission?.earnings
                          ? currencyFormatter(submission.commission.earnings)
                          : "-",
                      },
                    ]),
              ].map((item, index) => (
                <div key={index} className="grid grid-cols-2 gap-6">
                  <span className="text-sm font-medium text-neutral-500">
                    {item.label}
                  </span>
                  <span className="text-sm font-medium text-neutral-800">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Rejection details for rejected submissions */}
            {submission.status === "rejected" && submission.rejectionNote && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <Linkify
                  as="p"
                  options={{
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                    format: (href) => getPrettyUrl(href),
                    className:
                      "underline underline-offset-4 text-red-400 hover:text-red-700",
                  }}
                  className="mt-1 whitespace-pre-wrap text-sm text-red-800"
                >
                  {submission.rejectionNote}
                </Linkify>
              </div>
            )}
          </div>

          {bounty?.type === "submission" && (
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-neutral-900">
                  Submission
                </h2>
                {hasSocialContent && (
                  <div className="flex shrink-0 items-center gap-3">
                    {submission.socialMetricsLastSyncedAt ? (
                      <span className="whitespace-nowrap text-xs font-medium text-neutral-500">
                        Last sync{" "}
                        {timeAgo(submission.socialMetricsLastSyncedAt, {
                          withAgo: true,
                        })}
                      </span>
                    ) : null}
                    <Button
                      variant="secondary"
                      text="Refresh"
                      loading={isRefreshingSocialMetrics}
                      onClick={refreshSubmissionSocialMetrics}
                      className="h-8 rounded-lg px-3"
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-6">
                {hasSocialContent && (
                  <BountySocialContentPreview
                    bounty={bounty}
                    submission={submission}
                    authorOverride={{
                      name: submission.partner.name,
                      imageUrl: submission.partner.image ?? null,
                    }}
                  />
                )}

                {Boolean(submission.files?.length) && (
                  <div>
                    <h2 className="text-content-emphasis text-sm font-medium">
                      Files
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {submission.files!.map((file, idx) => (
                        <a
                          key={idx}
                          className="border-border-subtle hover:border-border-default group relative flex size-14 items-center justify-center rounded-md border bg-white"
                          target="_blank"
                          href={file.url}
                          rel="noopener noreferrer"
                        >
                          <div className="relative size-full overflow-hidden rounded-md">
                            <img src={file.url} alt="object-cover" />
                          </div>
                          <span className="sr-only">
                            {file.fileName || `File ${idx + 1}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {Boolean(submission.urls?.length) && !hasSocialContent && (
                  <div>
                    <h2 className="text-content-emphasis text-sm font-medium">
                      URLs
                    </h2>
                    <div className="mt-2 flex flex-col gap-2">
                      {submission.urls?.map((url, idx) => (
                        <div
                          className="relative"
                          key={`${submission.id}-${idx}-${url}`}
                        >
                          <div className="border-border-subtle block w-full rounded-lg border px-3 py-2 pl-10 pr-12">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block cursor-alias truncate text-sm font-normal text-neutral-800 decoration-dotted underline-offset-2 hover:underline"
                            >
                              {url}
                            </a>
                          </div>
                          <div className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                            <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                              {idx + 1}
                            </div>
                          </div>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                            <CopyButton
                              value={url}
                              onCopy={() => {
                                toast.success("URL copied to clipboard!");
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {submission.description && (
                  <div>
                    <h2 className="text-content-emphasis text-sm font-medium">
                      How did you complete this bounty?
                    </h2>
                    <span className="mt-2 whitespace-pre-wrap text-sm font-normal text-neutral-600">
                      {submission.description}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
          <div className="flex items-center justify-between gap-2 p-5">
            {submission.status === "approved" ? (
              <a
                href={`/${workspaceSlug}/program/commissions?partnerId=${submission.partner.id}&type=custom`}
                target="_blank"
                className="w-full"
              >
                <Button variant="secondary" text="View commissions" />
              </a>
            ) : (
              <div className="flex w-full flex-col gap-4">
                {!bounty?.rewardAmount && (
                  <div>
                    <label className="text-sm font-medium text-neutral-800">
                      Reward
                    </label>
                    <div className="mt-2">
                      <AmountInput
                        required
                        amountType="flat"
                        placeholder="0"
                        value={rewardAmount || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRewardAmount(val === "" ? null : parseFloat(val));
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex w-full gap-4">
                  <Button
                    type="button"
                    variant="danger"
                    text="Reject"
                    shortcut="R"
                    disabledTooltip={
                      submission.status === "draft"
                        ? "Bounty submission is in progress."
                        : submission.status === "rejected"
                          ? "Bounty submission already rejected."
                          : undefined
                    }
                    disabled={
                      isApprovingBountySubmission ||
                      submission.status === "draft"
                    }
                    onClick={() => setShowRejectModal(true)}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    text="Approve"
                    shortcut="A"
                    loading={isApprovingBountySubmission}
                    onClick={() => setShowApproveBountySubmissionModal(true)}
                    disabledTooltip={
                      submission.status === "draft"
                        ? "Bounty submission is in progress."
                        : undefined
                    }
                    disabled={!isValidForm || submission.status === "draft"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RejectBountySubmissionModal />
      {approveBountySubmissionModal}
    </div>
  );
}

export function BountySubmissionDetailsSheet({
  isOpen,
  ...rest
}: BountySubmissionDetailsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "submissionId", scroll: false })}
    >
      <BountySubmissionDetailsSheetContent {...rest} />
    </Sheet>
  );
}
