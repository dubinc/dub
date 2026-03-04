"use client";

import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/bounty-submission-status-badges";
import { REJECT_BOUNTY_SUBMISSION_REASONS } from "@/lib/bounty/constants";
import { PartnerBountyProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, CopyButton, Sheet, StatusBadge } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { Dispatch, Fragment, ReactNode, SetStateAction, useState } from "react";
import { toast } from "sonner";

type PartnerBountySubmission = PartnerBountyProps["submissions"][number];

function SubmissionDetailsView({
  submission,
}: {
  submission: PartnerBountySubmission;
}) {
  const statusBadge = BOUNTY_SUBMISSION_STATUS_BADGES[submission.status];
  const submittedDate = submission.completedAt ?? submission.createdAt;

  const textValue = (text: string) => (
    <span className="text-sm font-medium text-neutral-900">{text}</span>
  );

  const details: { label: string; value: ReactNode }[] = [];

  if (statusBadge) {
    details.push({
      label: "Status",
      value: (
        <StatusBadge
          variant={statusBadge.variant}
          icon={statusBadge.icon}
          className="w-fit rounded-lg py-1"
        >
          {statusBadge.label}
        </StatusBadge>
      ),
    });
  }

  if (submittedDate) {
    details.push({
      label: "Submitted",
      value: textValue(
        formatDate(submittedDate, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      ),
    });
  }

  if (submission.reviewedAt) {
    details.push({
      label: "Reviewed",
      value: textValue(
        formatDate(submission.reviewedAt, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      ),
    });
  }

  if (submission.rejectionReason) {
    details.push({
      label: "Rejection reason",
      value: textValue(
        REJECT_BOUNTY_SUBMISSION_REASONS[submission.rejectionReason] ??
          submission.rejectionReason,
      ),
    });
  }

  return (
    <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-5 p-5">
        <div>
          <h2 className="text-base font-semibold text-neutral-800">Details</h2>
          <div className="mt-3 grid grid-cols-2 items-center gap-x-16 gap-y-2">
            {details.map(({ label, value }) => (
              <Fragment key={label}>
                <span className="text-sm font-medium text-neutral-500">
                  {label}
                </span>
                <div>{value}</div>
              </Fragment>
            ))}
          </div>
        </div>

        {submission.rejectionNote && (
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="whitespace-pre-wrap text-sm text-orange-800">
              {submission.rejectionNote}
            </p>
          </div>
        )}

        {Boolean(submission.files?.length) && (
          <div>
            <h2 className="text-base font-semibold text-neutral-800">Images</h2>
            <div className="mt-2 flex flex-wrap gap-3">
              {submission.files!.map((file, idx) => (
                <a
                  key={idx}
                  className="border-border-subtle hover:border-border-default group relative flex size-14 items-center justify-center rounded-md border bg-white"
                  target="_blank"
                  href={file.url}
                  rel="noopener noreferrer"
                >
                  <div className="relative size-full overflow-hidden rounded-md">
                    <img
                      src={file.url}
                      alt={file.fileName || `File ${idx + 1}`}
                      className="object-cover"
                    />
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
            <h2 className="text-base font-semibold text-neutral-800">URLs</h2>
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
            <h2 className="text-base font-semibold text-neutral-800">
              Additional details
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
              {submission.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface BountySubmissionDetailsSheetProps {
  submission: PartnerBountySubmission;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export function BountySubmissionDetailsSheet({
  submission,
  isOpen,
  setIsOpen,
}: BountySubmissionDetailsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative flex size-full flex-col">
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
          <Sheet.Title className="text-base font-semibold text-neutral-900">
            Submission
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <SubmissionDetailsView submission={submission} />
      </div>
    </Sheet>
  );
}

export function useBountySubmissionDetailsSheet({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePeriodNumber, setActivePeriodNumber] = useState<
    number | undefined
  >();

  const submission =
    bounty.submissions?.find(
      (s) => s.periodNumber === (activePeriodNumber ?? 1),
    ) ?? null;

  return {
    bountySubmissionDetailsSheet: submission ? (
      <BountySubmissionDetailsSheet
        submission={submission}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ) : null,
    setShowBountySubmissionDetailsSheet: setIsOpen,
    setActivePeriodNumber,
  };
}
