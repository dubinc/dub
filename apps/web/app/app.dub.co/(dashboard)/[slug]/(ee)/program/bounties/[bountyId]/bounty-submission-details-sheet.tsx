"use client";

import { approveBountySubmissionAction } from "@/lib/actions/partners/approve-bounty-submission";
import { mutatePrefix } from "@/lib/swr/mutate";
import useBounty from "@/lib/swr/use-bounty";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useRejectBountySubmissionModal } from "@/ui/partners/reject-bounty-submission-modal";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, useRouterStuff } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";

type BountySubmissionDetailsSheetProps = {
  submission: BountySubmissionProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function BountySubmissionDetailsSheetContent({
  submission,
  setIsOpen,
}: BountySubmissionDetailsSheetProps) {
  const { bounty } = useBounty();
  const { id: workspaceId } = useWorkspace();
  const { setShowRejectModal, RejectBountySubmissionModal } =
    useRejectBountySubmissionModal(submission);

  const {
    executeAsync: approveBountySubmission,
    isPending: isApprovingBountySubmission,
  } = useAction(approveBountySubmissionAction, {
    onSuccess: async () => {
      toast.success("Bounty submission approved successfully!");
      setIsOpen(false);
      await mutatePrefix(`/api/bounties/${bounty?.id}/submissions`);
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
      if (!workspaceId || !submission.id) {
        return;
      }

      await approveBountySubmission({
        workspaceId,
        submissionId: submission.id,
      });
    },
  });

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
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="relative w-fit">
                <img
                  src={
                    submission.partner.image ||
                    `${OG_AVATAR_URL}${submission.partner.name}`
                  }
                  alt={submission.partner.name}
                  className="size-12 rounded-full"
                />
              </div>
              <div className="mt-4 flex items-start gap-2">
                <span className="text-lg font-semibold leading-tight text-neutral-900">
                  {submission.partner.name}
                </span>
              </div>
              {submission.partner.email && (
                <span className="text-sm text-neutral-500">
                  {submission.partner.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grow overflow-y-auto p-6">
          {/* Content will be added later */}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 p-5">
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
            disabledTooltip={
              submission.status === "approved"
                ? "Bounty submission already approved."
                : undefined
            }
            loading={isApprovingBountySubmission}
            onClick={() => setShowApproveBountySubmissionModal(true)}
          />
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
