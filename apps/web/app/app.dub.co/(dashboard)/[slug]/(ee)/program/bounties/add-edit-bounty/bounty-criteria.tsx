"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import {
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { InlineBadgePopover } from "@/ui/shared/inline-badge-popover";
import { MoneyBills2, ToggleGroup } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import { useMemo } from "react";
import { BountyAmountInput } from "./bounty-amount-input";
import { BountyCriteriaManualSubmission } from "./bounty-criteria-manual-submission";
import { BountyCriteriaSocialMetrics } from "./bounty-criteria-social-metrics";
import { useBountyFormContext } from "./bounty-form-context";
import { BountyLogic } from "./bounty-logic";

const BOUNTY_SUBMISSION_TYPES = [
  {
    value: "manualSubmission",
    label: "Manual submission",
  },
  {
    value: "socialMetrics",
    label: "Social metrics",
  },
] as const;

type BountySubmissionType = (typeof BOUNTY_SUBMISSION_TYPES)[number]["value"];

export function BountyCriteria() {
  const { plan } = useWorkspace();
  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal();

  const canUseBountySocialMetrics =
    getPlanCapabilities(plan).canUseBountySocialMetrics;

  const { watch, setValue } = useBountyFormContext();

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

  const submissionTypeOptions = useMemo(
    () => [
      {
        value: "manualSubmission",
        label: "Manual submission",
      },
      {
        value: "socialMetrics",
        label: !canUseBountySocialMetrics ? (
          <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            Social metrics
            <span
              className={cn(
                "rounded-sm px-1.5 py-1 text-[0.625rem] uppercase leading-none",
                "bg-violet-50 text-violet-600",
              )}
            >
              UPGRADE REQUIRED
            </span>
          </span>
        ) : (
          "Social metrics"
        ),
      },
    ],
    [canUseBountySocialMetrics],
  );

  return (
    <ProgramSheetAccordionItem value="bounty-criteria">
      <ProgramSheetAccordionTrigger>Criteria</ProgramSheetAccordionTrigger>
      <ProgramSheetAccordionContent>
        <div className="space-y-6">
          {showSubmissionContent && (
            <>
              {partnersUpgradeModal}
              <p className="text-content-default text-sm leading-relaxed">
                Set how partners claim bounties and how they&apos;re verified.
                By default an open text field is provided.
              </p>
              <ToggleGroup
                className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 p-1"
                optionClassName="h-8 flex flex-1 items-center justify-center gap-2 rounded-md text-sm whitespace-nowrap"
                indicatorClassName="bg-white border border-neutral-200 rounded-md shadow-sm"
                options={submissionTypeOptions}
                selected={submissionCriteriaType}
                selectAction={(id: BountySubmissionType) => {
                  setValue("submissionCriteriaType", id);

                  if (id === "socialMetrics") {
                    setValue(
                      "submissionRequirements",
                      {
                        socialMetrics: submissionRequirements?.socialMetrics,
                      },
                      {
                        shouldDirty: true,
                      },
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
                        rewardAmount != null &&
                        !isNaN(rewardAmount) &&
                        rewardAmount >= 0
                          ? currencyFormatter(rewardAmount * 100, {
                              trailingZeroDisplay: "stripIfInteger",
                            })
                          : "amount"
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
