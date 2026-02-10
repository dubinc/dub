"use client";

import {
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { AmountInput } from "@/ui/shared/amount-input";
import { ToggleGroup } from "@dub/ui";
import { cn } from "@dub/utils";
import { Controller } from "react-hook-form";
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
    control,
    register,
    watch,
    formState: { errors },
  } = useAddEditBountyForm();

  const [type, rewardDescription] = watch(["type", "rewardDescription"]);

  return (
    <ProgramSheetAccordionItem value="bounty-criteria">
      <ProgramSheetAccordionTrigger>Criteria</ProgramSheetAccordionTrigger>
      <ProgramSheetAccordionContent>
        <div className="space-y-6">
          <p className="text-content-default text-sm">
            Set the reward and completion criteria.
          </p>

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

          {(rewardType === "flat" || type === "performance") && (
            <div>
              <label
                htmlFor="rewardAmount"
                className="text-sm font-medium text-neutral-800"
              >
                Reward
              </label>
              <div className="mt-2">
                <Controller
                  name="rewardAmount"
                  control={control}
                  rules={{
                    required: true,
                    min: 0,
                  }}
                  render={({ field }) => (
                    <AmountInput
                      {...field}
                      id="rewardAmount"
                      amountType="flat"
                      placeholder="200"
                      error={errors.rewardAmount?.message}
                      value={
                        field.value == null || isNaN(field.value)
                          ? ""
                          : field.value
                      }
                      onChange={(e) => {
                        const val = e.target.value;

                        field.onChange(val === "" ? null : parseFloat(val));
                      }}
                    />
                  )}
                />
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

          {type === "performance" && (
            <div>
              <span className="text-sm font-medium text-neutral-800">
                Logic
              </span>
              <BountyLogic className="mt-2" />
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
