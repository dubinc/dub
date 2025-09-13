"use client";

import { approveBountySubmissionAction } from "@/lib/actions/partners/approve-bounty-submission";
import { mutatePrefix } from "@/lib/swr/mutate";
import useBounty from "@/lib/swr/use-bounty";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PartnerInfoSection } from "@/ui/partners/partner-info-section";
import { useRejectBountySubmissionModal } from "@/ui/partners/reject-bounty-submission-modal";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { X } from "@/ui/shared/icons";
import {
  Button,
  CopyButton,
  Sheet,
  StatusBadge,
  useRouterStuff,
} from "@dub/ui";
import { currencyFormatter, formatDate } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "./bounty-submission-status-badges";

type BountySubmissionDetailsSheetProps = {
  submission: BountySubmissionProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function BountySubmissionDetailsSheetContent({
  submission: { submission, partner, commission },
  setIsOpen,
}: BountySubmissionDetailsSheetProps) {
  const { bounty } = useBounty();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { setShowRejectModal, RejectBountySubmissionModal } =
    useRejectBountySubmissionModal(submission);

  const {
    executeAsync: approveBountySubmission,
    isPending: isApprovingBountySubmission,
  } = useAction(approveBountySubmissionAction, {
    onSuccess: async () => {
      toast.success("Bounty submission approved successfully!");
      setIsOpen(false);
      await mutatePrefix("/api/bounties");
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
    onConfirm: async () => {
      if (!workspaceId || !submission?.id) {
        return;
      }

      await approveBountySubmission({
        workspaceId,
        submissionId: submission.id,
      });
    },
  });

  if (!submission || !partner) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Review bounty submission
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="flex grow flex-col">
        <div className="border-b border-neutral-200 bg-neutral-50 p-6">
          <PartnerInfoSection partner={partner} showPartnerStatus={false}>
            <ButtonLink
              href={`/${workspaceSlug}/program/partners?partnerId=${partner.id}`}
              variant="secondary"
              className="h-8 w-fit px-3 py-2 text-sm font-medium"
              target="_blank"
            >
              View profile
            </ButtonLink>
          </PartnerInfoSection>
        </div>

        <div className="flex grow flex-col gap-8 overflow-y-auto p-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Bounty details
            </h2>

            <div className="mt-4 max-w-md space-y-3">
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
                  label: "Submitted",
                  value: formatDate(submission.createdAt, {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    timeZone: "UTC",
                  }),
                },
                {
                  label: "Reward",
                  value: commission?.earnings
                    ? currencyFormatter(commission.earnings / 100)
                    : "-",
                },
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
          </div>

          {bounty?.type === "submission" && (
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Bounty submission
              </h2>

              <div className="mt-6 flex flex-col gap-6">
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

                {Boolean(submission.urls?.length) && (
                  <div>
                    <h2 className="text-content-emphasis text-sm font-medium">
                      URLs
                    </h2>
                    <div className="mt-2 flex flex-col gap-2">
                      {submission.urls?.map((url) => (
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            className="border-border-subtle block w-full rounded-lg border px-3 py-2 pr-12 text-sm font-normal text-neutral-800 focus:border-neutral-300 focus:ring-0"
                            defaultValue={url}
                          />
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

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 p-5">
          {submission.status === "approved" ? (
            <a
              href={`/${workspaceSlug}/program/commissions?partnerId=${partner.id}&type=custom`}
              target="_blank"
              className="w-full"
            >
              <Button variant="secondary" text="View commissions" />
            </a>
          ) : (
            <>
              <Button
                type="button"
                variant="danger"
                text="Reject"
                disabledTooltip={
                  submission.status === "rejected"
                    ? "Bounty submission already rejected."
                    : undefined
                }
                disabled={isApprovingBountySubmission}
                onClick={() => setShowRejectModal(true)}
              />

              <Button
                type="submit"
                variant="primary"
                text="Approve"
                loading={isApprovingBountySubmission}
                onClick={() => setShowApproveBountySubmissionModal(true)}
              />
            </>
          )}
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

export function useBountySubmissionDetailsSheet(
  props: { nested?: boolean } & Omit<
    BountySubmissionDetailsSheetProps,
    "setIsOpen"
  >,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    BountySubmissionDetailsSheet: (
      <BountySubmissionDetailsSheet
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setShowBountySubmissionDetailsSheet: setIsOpen,
  };
}
