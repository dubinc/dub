"use client";

import {
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { InlineBadgePopover } from "@/ui/shared/inline-badge-popover";
import { CircleCheckFill, MoneyBills2, ToggleGroup } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import { BountyAmountInput } from "./bounty-amount-input";
import { useAddEditBountyForm } from "./bounty-form-context";
import { BountyLogic } from "./bounty-logic";

const REWARD_TYPES = [
  { value: "flat", label: "Flat rate" },
  { value: "custom", label: "Custom" },
];

type RewardType = "flat" | "custom";

interface BountyCriteriaSectionProps {
  rewardType: RewardType;
  setRewardType: (type: RewardType) => void;
}

export function BountyCriteriaSection({
  rewardType,
  setRewardType,
}: BountyCriteriaSectionProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useAddEditBountyForm();

  const [type, rewardDescription, rewardAmount] = watch([
    "type",
    "rewardDescription",
    "rewardAmount",
  ]);

  const showWhenThenCards =
    (rewardType === "flat" || type === "performance") &&
    (type === "performance" ||
      (type === "submission" && rewardType === "flat"));

  return (
    <ProgramSheetAccordionItem value="bounty-criteria">
      <ProgramSheetAccordionTrigger>Criteria</ProgramSheetAccordionTrigger>
      <ProgramSheetAccordionContent>
        <div className="space-y-6">
          {type === "submission" && (
            <ToggleGroup
              className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 p-1"
              optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm"
              indicatorClassName="bg-white border-none rounded-md"
              options={REWARD_TYPES}
              selected={rewardType}
              selectAction={(id: RewardType) => setRewardType(id)}
            />
          )}

          {showWhenThenCards && (
            <div className="flex flex-col gap-0">
              <div className="border-border-subtle rounded-xl border bg-white shadow-sm">
                <div className="flex items-center gap-2.5 p-2.5">
                  {type === "performance" ? (
                    <BountyLogic />
                  ) : (
                    <>
                      <RewardIconSquare icon={CircleCheckFill} />
                      <span className="text-content-emphasis text-sm font-medium leading-relaxed">
                        When partner submits
                      </span>
                    </>
                  )}
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

          {rewardType === "custom" && type === "submission" && (
            <div>
              <label
                htmlFor="rewardDescription"
                className="text-sm font-medium text-neutral-800"
              >
                Reward
              </label>
              <div className="mt-2">
                <input
                  id="rewardDescription"
                  type="text"
                  maxLength={100}
                  className={cn(
                    "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.rewardDescription &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  placeholder="Earn an additional 10% if you hit your revenue goal"
                  {...register("rewardDescription", {
                    setValueAs: (value) => (value === "" ? null : value),
                  })}
                />
                <div className="mt-1 text-left">
                  <span className="text-xs text-neutral-400">
                    {rewardDescription?.length || 0}/100
                  </span>
                </div>
              </div>
            </div>
          )}

          {rewardType === "custom" && type === "submission" && (
            <div className="gap-4 rounded-lg bg-orange-50 px-4 py-2.5 text-center">
              <span className="text-sm font-medium text-orange-800">
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
