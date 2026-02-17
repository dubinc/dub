"use client";

import type { SocialMetricsChannel } from "@/lib/types";
import {
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { InlineBadgePopover } from "@/ui/shared/inline-badge-popover";
import { MoneyBills2, ToggleGroup } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { BountyAmountInput } from "./bounty-amount-input";
import { BountyCriteriaManualSubmission } from "./bounty-criteria-manual-submission";
import { BountyCriteriaSocialMetrics } from "./bounty-criteria-social-metrics";
import { useAddEditBountyForm } from "./bounty-form-context";
import { BountyLogic } from "./bounty-logic";

const MANUAL_SUBMISSION_CRITERIA = [
  { value: "manualSubmission", label: "Manual submission" },
  { value: "socialMetrics", label: "Social metrics" },
];

type SubmissionCriteriaType = "manualSubmission" | "socialMetrics";

export function BountyCriteria() {
  const { watch, setValue } = useAddEditBountyForm();

  const [
    type,
    rewardAmount,
    submissionRequirements,
    rewardType = "flat",
    submissionCriteriaType = "manualSubmission",
  ] = watch([
    "type",
    "rewardAmount",
    "submissionRequirements",
    "rewardType",
    "submissionCriteriaType",
  ]);

  const requireImage = !!submissionRequirements?.image;
  const requireUrl = !!submissionRequirements?.url;
  const imageMax = submissionRequirements?.image?.max;
  const urlMax = submissionRequirements?.url?.max;
  const urlDomains = submissionRequirements?.url?.domains ?? [];

  const updateSubmissionRequirements = (
    imageRequired: boolean,
    urlRequired: boolean,
    imageMaxCount?: number,
    urlMaxCount?: number,
    urlDomainsList?: string[],
  ) => {
    const requirements: {
      image?: { max?: number };
      url?: { max?: number; domains?: string[] };
    } = {};

    if (imageRequired) {
      requirements.image = {};
      if (imageMaxCount !== undefined) {
        requirements.image.max = imageMaxCount;
      }
    }

    if (urlRequired) {
      requirements.url = {};
      if (urlMaxCount !== undefined) {
        requirements.url.max = urlMaxCount;
      }
      if (urlDomainsList && urlDomainsList.length > 0) {
        requirements.url.domains = urlDomainsList;
      }
    }

    setValue(
      "submissionRequirements",
      Object.keys(requirements).length > 0 ? requirements : null,
      { shouldDirty: true },
    );
  };

  const showPerformanceContent = type === "performance";
  const showSubmissionContent = type === "submission";

  const showWhenThenCards =
    (rewardType === "flat" || type === "performance") &&
    (type === "performance" ||
      (type === "submission" && rewardType === "flat"));

  return (
    <ProgramSheetAccordionItem value="bounty-criteria">
      <ProgramSheetAccordionTrigger>Criteria</ProgramSheetAccordionTrigger>
      <ProgramSheetAccordionContent>
        <div className="space-y-6">
          {showSubmissionContent && (
            <>
              <p className="text-content-default text-sm leading-relaxed">
                Set how partners claim bounties and how they&apos;re verified.
                By default an open text field is provided.
              </p>
              <ToggleGroup
                className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 p-1"
                optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm"
                indicatorClassName="bg-white border border-neutral-200 rounded-md shadow-sm"
                options={MANUAL_SUBMISSION_CRITERIA}
                selected={submissionCriteriaType}
                selectAction={(id) => {
                  const next = id as SubmissionCriteriaType;
                  setValue("submissionCriteriaType", next);
                  if (next === "socialMetrics") {
                    const current = submissionRequirements as {
                      socialMetrics?: {
                        channel: SocialMetricsChannel;
                        metric: string;
                        amount: number;
                      };
                    } | null;
                    setValue(
                      "submissionRequirements",
                      {
                        socialMetrics: current?.socialMetrics,
                      },
                      { shouldDirty: true },
                    );
                  } else {
                    updateSubmissionRequirements(
                      requireImage,
                      requireUrl,
                      imageMax,
                      urlMax,
                      urlDomains,
                    );
                  }
                }}
              />

              {submissionCriteriaType === "manualSubmission" && (
                <BountyCriteriaManualSubmission />
              )}

              {submissionCriteriaType === "socialMetrics" && (
                <BountyCriteriaSocialMetrics />
              )}
            </>
          )}

          {showPerformanceContent && showWhenThenCards && (
            <div className="flex flex-col gap-0">
              <div className="border-border-subtle rounded-xl border bg-white shadow-sm">
                <div className="flex items-center gap-2.5 p-2.5">
                  <BountyLogic />
                </div>
              </div>

              <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />

              <div className="border-border-subtle rounded-xl border bg-white shadow-sm">
                <div className="flex items-center gap-2.5 p-2.5">
                  <RewardIconSquare icon={MoneyBills2} />
                  <span className="text-content-emphasis text-sm font-medium leading-relaxed">
                    Then pay{" "}
                    <InlineBadgePopover
                      text={
                        rewardAmount != null && !isNaN(rewardAmount)
                          ? currencyFormatter(rewardAmount * 100, {
                              trailingZeroDisplay: "stripIfInteger",
                            })
                          : "$0"
                      }
                      invalid={
                        rewardAmount == null ||
                        isNaN(rewardAmount) ||
                        rewardAmount < 0
                      }
                    >
                      <BountyAmountInput name="rewardAmount" />
                    </InlineBadgePopover>
                  </span>
                </div>
              </div>
            </div>
          )}

          {rewardType === "custom" &&
            showSubmissionContent &&
            submissionCriteriaType === "manualSubmission" && (
              <div className="rounded-lg bg-orange-50 px-4 py-2 text-center">
                <span className="text-sm font-medium leading-5 text-orange-900">
                  When reviewing these submissions, a custom reward amount will
                  be required to approve.
                </span>
              </div>
            )}
        </div>
      </ProgramSheetAccordionContent>
    </ProgramSheetAccordionItem>
  );
}
