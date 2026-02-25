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
  Sheet,
  StatusBadge,
} from "@dub/ui";
import { Calendar6 } from "@dub/ui/icons";
import { formatDate, getPrettyUrl } from "@dub/utils";
import Linkify from "linkify-react";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";

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
            <StatusBadge
              variant={statusBadge.variant}
              icon={statusBadge.icon}
              className="w-fit rounded-lg py-1.5"
            >
              {statusLabelWithDate}
            </StatusBadge>
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

          {/* Submission section */}
          {bounty?.type === "submission" && hasSocialContent && (
            <div className="p-5">
              <h2 className="text-base font-semibold text-neutral-900">
                Submission
              </h2>
              <div className="mt-3">
                <BountySocialContentPreview
                  bounty={bounty}
                  submission={submission}
                />
              </div>
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
  const canOpen = bounty?.submission && bounty.submission.status !== "draft";

  return {
    partnerBountySubmissionDetailsSheet:
      canOpen && bounty ? (
        <PartnerBountySubmissionDetailsSheet
          bounty={bounty}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      ) : null,
    setPartnerBountySubmissionDetailsSheetOpen: setIsOpen,
  };
}
