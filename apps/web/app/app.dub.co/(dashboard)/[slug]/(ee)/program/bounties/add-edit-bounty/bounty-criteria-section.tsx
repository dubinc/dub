"use client";

import {
  BOUNTY_DEFAULT_SUBMISSION_URLS,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_URLS,
} from "@/lib/constants/bounties";
import {
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import {
  InlineBadgePopover,
  InlineBadgePopoverInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import {
  Button,
  ImageIcon,
  MoneyBills2,
  NumberStepper,
  Switch,
  ToggleGroup,
} from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import { Controller } from "react-hook-form";
import { BountyAmountInput } from "./bounty-amount-input";
import { useAddEditBountyForm } from "./bounty-form-context";
import { BountyLogic } from "./bounty-logic";

const REWARD_TYPES = [
  { value: "flat", label: "flat rate" },
  { value: "custom", label: "custom" },
];

const MANUAL_SUBMISSION_CRITERIA = [
  { value: "manualSubmission", label: "Manual submission" },
  { value: "socialMetrics", label: "Social metrics" },
];

type RewardType = "flat" | "custom";
type SubmissionCriteriaType = "manualSubmission" | "socialMetrics";

interface BountyCriteriaSectionProps {
  rewardType: RewardType;
  setRewardType: (type: RewardType) => void;
  submissionCriteriaType?: SubmissionCriteriaType;
  setSubmissionCriteriaType?: (type: SubmissionCriteriaType) => void;
  requireImage?: boolean;
  requireUrl?: boolean;
  onRequireImageToggle?: (checked: boolean) => void;
  onRequireUrlToggle?: (checked: boolean) => void;
  imageMax?: number;
  urlMax?: number;
  urlDomains?: string[];
  onImageMaxChange?: (value: number) => void;
  onUrlMaxChange?: (value: number) => void;
  onAddDomain?: (domain: string) => void;
  onRemoveDomain?: (domain: string) => void;
}

export function BountyCriteriaSection({
  rewardType,
  setRewardType,
  submissionCriteriaType = "manualSubmission",
  setSubmissionCriteriaType,
  requireImage = false,
  requireUrl = false,
  onRequireImageToggle,
  onRequireUrlToggle,
  imageMax,
  urlMax,
  urlDomains = [],
  onImageMaxChange,
  onUrlMaxChange,
  onAddDomain,
  onRemoveDomain,
}: BountyCriteriaSectionProps) {
  const { control, watch } = useAddEditBountyForm();

  const [type, rewardDescription, rewardAmount] = watch([
    "type",
    "rewardDescription",
    "rewardAmount",
  ]);

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
                selectAction={(id) =>
                  setSubmissionCriteriaType?.(id as SubmissionCriteriaType)
                }
              />
              {submissionCriteriaType === "manualSubmission" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Switch
                      fn={(checked) => onRequireImageToggle?.(checked)}
                      checked={requireImage}
                      trackDimensions="w-8 h-4"
                      thumbDimensions="w-3 h-3"
                      thumbTranslate="translate-x-4"
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Require at least one image
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      fn={(checked) => onRequireUrlToggle?.(checked)}
                      checked={requireUrl}
                      trackDimensions="w-8 h-4"
                      thumbDimensions="w-3 h-3"
                      thumbTranslate="translate-x-4"
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Require at least one URL
                    </span>
                  </div>
                </div>
              )}
              {(requireImage || requireUrl) &&
                submissionCriteriaType === "manualSubmission" && (
                  <div className="space-y-4">
                    {requireImage && (
                      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                        <label className="text-sm font-medium text-neutral-700">
                          Maximum images
                          <span className="ml-1 font-normal text-neutral-500">
                            (optional)
                          </span>
                        </label>
                        <NumberStepper
                          value={imageMax ?? BOUNTY_MAX_SUBMISSION_FILES}
                          onChange={(v) => onImageMaxChange?.(v)}
                          min={1}
                          max={BOUNTY_MAX_SUBMISSION_FILES}
                          step={1}
                          className="h-9 w-full [&>div]:h-9"
                        />
                        <p className="text-xs text-neutral-500">
                          Set a maximum number of images partners can submit
                        </p>
                      </div>
                    )}
                    {requireUrl && (
                      <div className="space-y-4">
                        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                          <label className="text-sm font-medium text-neutral-700">
                            Maximum URLs
                            <span className="ml-1 font-normal text-neutral-500">
                              (optional)
                            </span>
                          </label>
                          <NumberStepper
                            value={urlMax ?? BOUNTY_DEFAULT_SUBMISSION_URLS}
                            onChange={(v) => onUrlMaxChange?.(v)}
                            min={1}
                            max={BOUNTY_MAX_SUBMISSION_URLS}
                            step={1}
                            className="h-9 w-full [&>div]:h-9"
                          />
                          <p className="text-xs text-neutral-500">
                            Set a maximum number of URLs partners can submit
                          </p>
                        </div>
                        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                          <label className="text-sm font-medium text-neutral-700">
                            Allowed domains
                            <span className="ml-1 font-normal text-neutral-500">
                              (optional)
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. x.com"
                              className={cn(
                                "block h-9 flex-1 rounded-md border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const input = e.currentTarget;
                                  onAddDomain?.(input.value);
                                  input.value = "";
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              text="Add"
                              className="h-9 w-fit px-3"
                              onClick={(e) => {
                                const input = e.currentTarget
                                  .previousElementSibling as HTMLInputElement;
                                if (input) {
                                  onAddDomain?.(input.value);
                                  input.value = "";
                                }
                              }}
                            />
                          </div>
                          {urlDomains.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {urlDomains.map((domain) => (
                                <div
                                  key={domain}
                                  className="flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1.5 text-sm text-neutral-700"
                                >
                                  <span>{domain}</span>
                                  <button
                                    type="button"
                                    onClick={() => onRemoveDomain?.(domain)}
                                    className="text-neutral-400 hover:text-neutral-600"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-neutral-500">
                            Restrict URLs to specific domains. Partners can
                            submit URLs from these domains or their subdomains.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <RewardIconSquare icon={ImageIcon} />
                  <span className="text-content-default text-sm leading-relaxed">
                    On approval, pay a{" "}
                    <InlineBadgePopover
                      text={
                        rewardType === "flat" ? "flat rate" : "custom amount"
                      }
                      buttonClassName="!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                    >
                      <InlineBadgePopoverMenu
                        items={REWARD_TYPES.map(({ value, label }) => ({
                          value,
                          text: label,
                        }))}
                        selectedValue={rewardType}
                        onSelect={(v) => setRewardType(v as RewardType)}
                      />
                    </InlineBadgePopover>{" "}
                    {rewardType === "flat" ? "of " : "shown as "}
                    {rewardType === "flat" ? (
                      <InlineBadgePopover
                        text={
                          rewardAmount != null && !isNaN(rewardAmount)
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
                        buttonClassName={
                          rewardAmount != null &&
                          !isNaN(rewardAmount) &&
                          rewardAmount >= 0
                            ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                            : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
                        }
                      >
                        <BountyAmountInput name="rewardAmount" />
                      </InlineBadgePopover>
                    ) : (
                      <InlineBadgePopover
                        text={rewardDescription || "reward description"}
                        invalid={!rewardDescription?.trim()}
                        buttonClassName={
                          rewardDescription?.trim()
                            ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                            : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
                        }
                      >
                        <Controller
                          control={control}
                          name="rewardDescription"
                          rules={{ maxLength: 100 }}
                          render={({ field }) => (
                            <InlineBadgePopoverInput
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const val = (e.target as HTMLInputElement)
                                  .value;
                                field.onChange(val === "" ? null : val);
                              }}
                              placeholder="Earn an additional 10% if you hit your revenue goal"
                              maxLength={100}
                            />
                          )}
                        />
                      </InlineBadgePopover>
                    )}
                  </span>
                </div>
              </div>
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
