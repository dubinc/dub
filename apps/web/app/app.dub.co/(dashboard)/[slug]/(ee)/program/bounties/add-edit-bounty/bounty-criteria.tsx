"use client";

import {
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { InlineBadgePopover } from "@/ui/shared/inline-badge-popover";
import { MoneyBills2 } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { BountyAmountInput } from "./bounty-amount-input";
import { BountyCriteriaManualSubmission } from "./bounty-criteria-manual-submission";
import { BountyCriteriaSocialMetrics } from "./bounty-criteria-social-metrics";
import { useBountyFormContext } from "./bounty-form-context";
import { BountyLogic } from "./bounty-logic";

export function BountyCriteria() {
  const { watch } = useBountyFormContext();

  const [
    bountyTypeUI = "performance",
    rewardAmount,
    rewardType = "flat",
  ] = watch(["bountyTypeUI", "rewardAmount", "rewardType"]);

  const showPerformanceContent = bountyTypeUI === "performance";
  const showSubmissionContent = bountyTypeUI === "submission";
  const showSocialMetricsContent = bountyTypeUI === "socialMetrics";

  const showWhenThenCards =
    (rewardType === "flat" || bountyTypeUI === "performance") &&
    (bountyTypeUI === "performance" ||
      (bountyTypeUI === "submission" && rewardType === "flat"));

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
              <BountyCriteriaManualSubmission />
            </>
          )}

          {showSocialMetricsContent && <BountyCriteriaSocialMetrics />}

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

          {rewardType === "custom" && showSubmissionContent && (
            <div className="rounded-lg bg-orange-50 px-4 py-2 text-center">
              <span className="text-sm font-medium leading-5 text-orange-900">
                When reviewing these submissions, a custom reward amount will be
                required to approve.
              </span>
            </div>
          )}
        </div>
      </ProgramSheetAccordionContent>
    </ProgramSheetAccordionItem>
  );
}
