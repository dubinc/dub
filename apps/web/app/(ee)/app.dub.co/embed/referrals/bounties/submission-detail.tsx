"use client";

import { REJECT_BOUNTY_SUBMISSION_REASONS } from "@/lib/bounty/constants";
import { getPeriodLabel } from "@/lib/bounty/periods";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/submission-status";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { BountySocialMetricsRewardsTable } from "@/ui/partners/bounties/bounty-social-metrics-rewards-table";
import {
  SocialContentPreview,
  SubmissionRewardTable,
} from "@/ui/partners/bounties/bounty-submission-details-sheet";
import { CopyButton, StatusBadge } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { Fragment } from "react";
import { toast } from "sonner";
import { headerButtonClass, SubmissionCardHeader } from "./submission-form";

type PartnerBountySubmission = PartnerBountyProps["submissions"][number];

export function EmbedBountySubmissionDetail({
  bounty,
  submission,
  periodNumber,
  onBack,
}: {
  bounty: PartnerBountyProps;
  submission: PartnerBountySubmission;
  periodNumber: number;
  onBack: () => void;
}) {
  const title =
    bounty.maxSubmissions > 1
      ? `Submission (${getPeriodLabel(bounty.submissionFrequency, periodNumber - 1)})`
      : "Submission";

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <SubmissionCardHeader
        title={title}
        rightContent={
          <button
            type="button"
            onClick={onBack}
            className={headerButtonClass()}
          >
            Back
          </button>
        }
      />

      <div className="grid grid-cols-1 divide-y divide-neutral-200 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:divide-x lg:divide-y-0">
        <SubmissionLeftColumn bounty={bounty} submission={submission} />
        <SubmissionRightColumn bounty={bounty} submission={submission} />
      </div>
    </div>
  );
}

function SubmissionLeftColumn({
  bounty,
  submission,
}: {
  bounty: PartnerBountyProps;
  submission: PartnerBountySubmission;
}) {
  const bountyInfo = resolveBountyDetails(bounty);

  return (
    <div className="flex flex-col gap-5 p-5">
      <SocialContentPreview bounty={bounty} submission={submission} />

      {bountyInfo?.hasSocialMetrics ? null : (
        <SubmissionRewardTable submission={submission} />
      )}

      {(Boolean(submission.files?.length) ||
        (Boolean(submission.urls?.length) && !bountyInfo?.hasSocialMetrics) ||
        submission.description) && (
        <div className="flex flex-col gap-4">
          {!bountyInfo?.hasSocialMetrics && (
            <h2 className="text-base font-semibold text-neutral-800">
              Submitted content
            </h2>
          )}

          {Boolean(submission.files?.length) && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700">Images</h3>
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

          {Boolean(submission.urls?.length) &&
            !bountyInfo?.hasSocialMetrics && (
              <div>
                <h3 className="text-sm font-medium text-neutral-700">URLs</h3>
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
                          onCopy={() =>
                            toast.success("URL copied to clipboard!")
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {submission.description && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700">
                Provide any additional details (optional)
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
                {submission.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionRightColumn({
  bounty,
  submission,
}: {
  bounty: PartnerBountyProps;
  submission: PartnerBountySubmission;
}) {
  const bountyInfo = resolveBountyDetails(bounty);
  const statusBadge = BOUNTY_SUBMISSION_STATUS_BADGES[submission.status];
  const submittedDate = submission.completedAt ?? submission.createdAt;

  const textValue = (text: string) => (
    <span className="text-sm font-medium text-neutral-900">{text}</span>
  );

  const details: { label: string; value: React.ReactNode }[] = [];

  if (statusBadge) {
    details.push({
      label: "Status",
      value: (
        <StatusBadge
          variant={statusBadge.variant}
          icon={statusBadge.icon}
          className="w-fit rounded-lg py-1"
        >
          {submission.status === "submitted"
            ? "Pending review"
            : statusBadge.label}
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
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-base font-semibold text-neutral-800">Details</h2>
        <div className="mt-3 grid grid-cols-2 items-center gap-x-14 gap-y-1">
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
          <p className="whitespace-pre-wrap text-sm leading-6 text-orange-800">
            {submission.rejectionNote}
          </p>
        </div>
      )}

      {bountyInfo?.hasSocialMetrics && (
        <BountySocialMetricsRewardsTable
          bounty={bounty}
          submission={submission}
        />
      )}
    </div>
  );
}
