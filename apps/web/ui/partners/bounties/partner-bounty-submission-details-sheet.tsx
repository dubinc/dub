"use client";

import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/bounty-submission-status-badges";
import { REJECT_BOUNTY_SUBMISSION_REASONS } from "@/lib/bounty/constants";
import { getBountyRewardDescription } from "@/lib/bounty/get-bounty-reward-description";
import { getBountyInfo } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { BountyDescription } from "@/ui/partners/bounties/bounty-description";
import { BountySocialContentPreview } from "@/ui/partners/bounties/bounty-social-content-preview";
import { BountySocialMetricsRewardsTable } from "@/ui/partners/bounties/bounty-social-metrics-rewards-table";
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
import { formatDate, getPrettyUrl } from "@dub/utils";
import Linkify from "linkify-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { BountyIncrementalBonusTooltip } from "./bounty-incremental-bonus-tooltip";

interface PartnerBountySubmissionDetailsSheetProps {
  bounty: PartnerBountyProps;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function PartnerBountySubmissionDetailsSheetContent({
  bounty,
}: Omit<PartnerBountySubmissionDetailsSheetProps, "isOpen" | "setIsOpen">) {
  const { programSlug } = useParams();

  const submission = bounty.submission!;
  const bountyInfo = getBountyInfo(bounty);
  const description = getBountyRewardDescription(bounty);

  const hasSocialContent =
    bountyInfo?.hasSocialMetrics && (submission.urls?.length ?? 0) > 0;

  const statusBadge = BOUNTY_SUBMISSION_STATUS_BADGES[submission.status];

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Bounty submission
        </Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<X className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          <div className="space-y-6 p-5">
            <Accordion
              type="single"
              collapsible
              className="w-full rounded-xl bg-neutral-100 p-4"
            >
              <AccordionItem value="details" className="border-none py-0">
                <AccordionTrigger className="py-1.5 text-base font-semibold text-neutral-900 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Details
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-2">
                  <div className="space-y-3">
                    <BountyDescription bounty={bounty} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="max-w-md space-y-2">
              {[
                {
                  label: "Status",
                  value: (
                    <StatusBadge
                      variant={statusBadge.variant}
                      icon={statusBadge.icon}
                    >
                      {statusBadge.label}
                    </StatusBadge>
                  ),
                },
                {
                  label:
                    bounty?.type === "performance" ? "Completed" : "Submitted",
                  value: submission.completedAt
                    ? formatDate(submission.completedAt, { month: "short" })
                    : "-",
                },
                ...(bountyInfo?.socialMetrics
                  ? [
                      {
                        label: "Criteria",
                        value: `${bountyInfo.socialMetrics.minCount} ${bountyInfo.socialMetrics.metric}`,
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
                            submission.rejectionReason
                          ],
                      },
                    ]
                  : [
                      {
                        label: "Reward",
                        value: (
                          <div className="flex items-center gap-2">
                            <span>{description}</span>
                            <BountyIncrementalBonusTooltip bounty={bounty} />
                          </div>
                        ),
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

            {submission.status === "rejected" && submission.rejectionNote && (
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

            {bounty?.type === "submission" && (
              <>
                {hasSocialContent && (
                  <div>
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

                {bountyInfo?.hasSocialMetrics && bounty && (
                  <BountySocialMetricsRewardsTable
                    bounty={bounty}
                    submission={
                      submission as unknown as Parameters<
                        typeof BountySocialMetricsRewardsTable
                      >[0]["submission"]
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>

        {submission.status === "approved" && programSlug ? (
          <div className="shrink-0 border-t border-neutral-200 p-5">
            <Link
              href={`/programs/${programSlug}/earnings?type=custom`}
              target="_blank"
              className="w-full"
            >
              <Button
                variant="secondary"
                text="View earnings"
                className="w-full"
              />
            </Link>
          </div>
        ) : null}
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
