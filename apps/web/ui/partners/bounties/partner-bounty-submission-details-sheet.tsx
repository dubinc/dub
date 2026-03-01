"use client";

import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/bounty-submission-status-badges";
import { REJECT_BOUNTY_SUBMISSION_REASONS } from "@/lib/bounty/constants";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import {
  BountyDescription,
  bountyHasDetails,
} from "@/ui/partners/bounties/bounty-description";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountySocialContentPreview } from "@/ui/partners/bounties/bounty-social-content-preview";
import { BountySocialMetricsRewardsTable } from "@/ui/partners/bounties/bounty-social-metrics-rewards-table";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { X } from "@/ui/shared/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  CopyButton,
  Sheet,
  StatusBadge,
} from "@dub/ui";
import { Calendar6 } from "@dub/ui/icons";
import { formatDate, getPrettyUrl } from "@dub/utils";
import Linkify from "linkify-react";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";

interface PartnerBountySubmissionDetailsSheetProps {
  bounty: PartnerBountyProps;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function PartnerBountySubmissionDetailsSheetContent({
  bounty,
}: Omit<PartnerBountySubmissionDetailsSheetProps, "isOpen" | "setIsOpen">) {
  const { programSlug } = useParams();

  const submission = bounty.submission! as BountySubmissionProps;
  const bountyInfo = resolveBountyDetails(bounty);

  const hasSocialContent =
    bountyInfo?.hasSocialMetrics && (submission.urls?.length ?? 0) > 0;

  const statusBadge = BOUNTY_SUBMISSION_STATUS_BADGES[submission.status];

  const statusDate =
    submission.status === "approved"
      ? submission.reviewedAt
      : submission.status === "submitted"
        ? submission.completedAt
        : submission.status === "rejected"
          ? submission.reviewedAt
          : null;
  const statusLabelWithDate =
    statusDate != null
      ? `${statusBadge.label} ${formatDate(statusDate, { month: "short", day: "numeric", year: "numeric" })}`
      : statusBadge.label;

  return (
    <div className="relative flex size-full flex-col">
      <Sheet.Close asChild>
        <Button
          variant="outline"
          icon={<X className="size-5" />}
          className="absolute right-4 top-4 z-10 h-auto w-fit p-1"
        />
      </Sheet.Close>
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Thumbnail header (matches claim-bounty-modal) */}
        <div className="flex h-[132px] shrink-0 items-center justify-center bg-neutral-100 py-3">
          <div className="relative size-full">
            <BountyThumbnailImage bounty={bounty} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col divide-y divide-neutral-200">
          {/* Bounty title, ends at, earn, status */}
          <div className="flex flex-col gap-1 p-5">
            <Sheet.Title className="text-content-emphasis truncate text-sm font-semibold">
              {bounty.name ?? "Bounty"}
            </Sheet.Title>
            <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
              <Calendar6 className="size-3.5 shrink-0" />
              {bounty.endsAt
                ? `Ends ${formatDate(bounty.endsAt, { month: "short", day: "numeric", year: "numeric" })}`
                : "No end date"}
            </div>
            <BountyRewardDescription bounty={bounty} className="font-medium" />
            {statusDate && (
              <StatusBadge
                variant={statusBadge.variant}
                icon={statusBadge.icon}
                className="w-fit rounded-lg py-1.5"
              >
                {statusLabelWithDate}
              </StatusBadge>
            )}
          </div>

          {/* Details accordion (only when there is content; open by default to match design) */}
          {bountyHasDetails(bounty) && (
            <Accordion type="single" collapsible className="w-full p-5">
              <AccordionItem
                value="details"
                className="border-none bg-transparent py-0"
              >
                <AccordionTrigger className="!text-base font-semibold text-neutral-900">
                  Details
                </AccordionTrigger>
                <AccordionContent>
                  <BountyDescription bounty={bounty} hideHeading />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {submission.status === "rejected" && (
            <div className="p-5">
              {submission.rejectionNote && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
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

              {submission.rejectionReason && (
                <p className="text-content-subtle text-sm">
                  <span className="font-medium text-neutral-700">
                    Rejection reason:{" "}
                  </span>
                  {REJECT_BOUNTY_SUBMISSION_REASONS[submission.rejectionReason]}
                </p>
              )}
            </div>
          )}

          {bounty?.type === "submission" &&
            bountyInfo?.hasSocialMetrics &&
            bounty && (
              <div className="p-5">
                <BountySocialMetricsRewardsTable
                  bounty={bounty}
                  submission={submission}
                  titleText="Earnings"
                />
              </div>
            )}

          {/* Submission section */}
          {bounty?.type === "submission" && (
            <div className="p-5">
              <h2 className="text-base font-semibold text-neutral-900">
                Submission
              </h2>
              <div className="mt-3 flex flex-col gap-4">
                {hasSocialContent && (
                  <BountySocialContentPreview
                    bounty={bounty}
                    submission={submission}
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

          {submission.status === "approved" && (
            <div className="mt-auto p-5 pt-2">
              <ButtonLink
                href={`/programs/${programSlug}/earnings?type=custom`}
                target="_blank"
                variant="secondary"
                className="mt-3 w-full justify-center text-sm font-medium"
              >
                View earnings
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PartnerBountySubmissionDetailsSheet({
  bounty,
  isOpen,
  ...rest
}: PartnerBountySubmissionDetailsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <PartnerBountySubmissionDetailsSheetContent bounty={bounty} {...rest} />
    </Sheet>
  );
}

export function usePartnerBountySubmissionDetailsSheet(
  bounty: PartnerBountyProps | null,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    partnerBountySubmissionDetailsSheet: bounty ? (
      <PartnerBountySubmissionDetailsSheet
        bounty={bounty}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ) : null,
    setPartnerBountySubmissionDetailsSheetOpen: setIsOpen,
  };
}
