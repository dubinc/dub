"use client";

import {
  BOUNTY_SOCIAL_PLATFORM_METRICS,
  BOUNTY_SOCIAL_PLATFORMS,
} from "@/lib/bounty/constants";
import type { SocialMetricsChannel } from "@/lib/types";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import {
  ArrowTurnRight2,
  Button,
  Megaphone,
  MoneyBills2,
  Refresh2,
  Tooltip,
} from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { HelpCircle } from "lucide-react";
import { useContext } from "react";
import { BountyAmountInput } from "./bounty-amount-input";
import { useAddEditBountyForm } from "./bounty-form-context";

interface VariableBonus {
  incrementalAmount?: number;
  bonusAmount?: number;
  capAmount?: number;
}

interface SocialMetricsCriteria {
  socialMetrics?: {
    channel: SocialMetricsChannel;
    metric: string;
    amount: number;
    variableBonus?: VariableBonus;
  };
}

interface SocialMetricsVariableBonusProps {
  variableBonus: VariableBonus;
  metricLabel: string;
  onUpdate: (updates: Partial<VariableBonus>) => void;
  onRemove: () => void;
}

export function BountyCriteriaSocialMetrics() {
  const { watch, setValue } = useAddEditBountyForm();

  const submissionRequirements = watch(
    "submissionRequirements",
  ) as SocialMetricsCriteria | null;

  const rewardAmount = watch("rewardAmount");

  const socialMetrics = submissionRequirements?.socialMetrics;
  const hasChannel = socialMetrics?.channel != null;
  const hasAmount = socialMetrics?.amount != null && socialMetrics.amount > 0;
  const hasMetric = socialMetrics?.metric != null;

  const updateSocialMetrics = (
    updates: Partial<{
      channel: SocialMetricsChannel;
      metric: string;
      amount: number;
      variableBonus?: VariableBonus | undefined;
    }>,
  ) => {
    const nextChannel =
      updates.channel ??
      socialMetrics?.channel ??
      ("youtube" as SocialMetricsChannel);
    const channelMetrics = BOUNTY_SOCIAL_PLATFORM_METRICS[nextChannel];
    const nextMetric =
      updates.metric ??
      (socialMetrics?.metric &&
      channelMetrics.some((m) => m.value === socialMetrics.metric)
        ? socialMetrics.metric
        : channelMetrics[0].value);
    const nextAmount = updates.amount ?? socialMetrics?.amount ?? 0;
    const nextVariableBonus =
      "variableBonus" in updates
        ? updates.variableBonus
        : socialMetrics?.variableBonus;
    setValue(
      "submissionRequirements",
      {
        socialMetrics: {
          channel: nextChannel,
          metric: nextMetric,
          amount: nextAmount,
          ...(nextVariableBonus && { variableBonus: nextVariableBonus }),
        },
      },
      { shouldDirty: true },
    );
  };

  const updateVariableBonus = (updates: Partial<VariableBonus>) => {
    const current = socialMetrics?.variableBonus ?? {};
    updateSocialMetrics({
      variableBonus: {
        incrementalAmount:
          "incrementalAmount" in updates
            ? updates.incrementalAmount
            : current.incrementalAmount,
        bonusAmount:
          "bonusAmount" in updates ? updates.bonusAmount : current.bonusAmount,
        capAmount:
          "capAmount" in updates ? updates.capAmount : current.capAmount,
      },
    });
  };

  const addVariableBonus = () => {
    updateSocialMetrics({ variableBonus: {} });
  };

  const removeVariableBonus = () => {
    updateSocialMetrics({ variableBonus: undefined });
  };

  const variableBonus = socialMetrics?.variableBonus;

  const channelLabel = hasChannel
    ? BOUNTY_SOCIAL_PLATFORMS.find((c) => c.value === socialMetrics!.channel)
        ?.label ?? socialMetrics!.channel
    : "channel";

  const metricLabel = hasMetric
    ? SOCIAL_METRICS_CHANNEL_METRICS[socialMetrics!.channel]?.find(
        (m) => m.value === socialMetrics!.metric,
      )?.label ?? socialMetrics!.metric
    : "metric";

  const metricChannelForMenu = socialMetrics?.channel ?? "youtube";

  return (
    <div className="flex flex-col gap-0">
      <div className="border-border-subtle rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-2.5 p-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
            <Megaphone className="size-4 text-neutral-800" />
          </div>
          <span className="text-content-emphasis text-sm font-medium leading-relaxed">
            If their post on{" "}
            <InlineBadgePopover
              text={channelLabel}
              invalid={!hasChannel}
              buttonClassName={
                hasChannel
                  ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                  : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
              }
            >
              <InlineBadgePopoverMenu
                items={BOUNTY_SOCIAL_PLATFORMS.map((c) => ({
                  value: c.value,
                  text: c.label,
                }))}
                selectedValue={socialMetrics?.channel}
                onSelect={(v) =>
                  updateSocialMetrics({ channel: v as SocialMetricsChannel })
                }
              />
            </InlineBadgePopover>{" "}
            has{" "}
            <InlineBadgePopover
              text={hasAmount ? String(socialMetrics!.amount) : "amount"}
              invalid={!hasAmount}
              buttonClassName={
                hasAmount
                  ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                  : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
              }
            >
              <InlineBadgePopoverInput
                type="number"
                min={1}
                value={
                  socialMetrics?.amount == null || socialMetrics?.amount === 0
                    ? ""
                    : String(socialMetrics.amount)
                }
                onChange={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  const num = raw === "" ? 0 : parseInt(raw, 10);
                  updateSocialMetrics({
                    amount: Number.isNaN(num) ? 1 : Math.max(1, num),
                  });
                }}
                placeholder="amount"
              />
            </InlineBadgePopover>{" "}
            <InlineBadgePopover
              text={metricLabel}
              invalid={!hasMetric}
              buttonClassName={
                hasMetric
                  ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                  : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
              }
            >
              <InlineBadgePopoverMenu
                items={SOCIAL_METRICS_CHANNEL_METRICS[metricChannelForMenu].map(
                  (m) => ({ value: m.value, text: m.label }),
                )}
                selectedValue={socialMetrics?.metric}
                onSelect={(v) => updateSocialMetrics({ metric: v })}
              />
            </InlineBadgePopover>
          </span>
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
                rewardAmount == null || isNaN(rewardAmount) || rewardAmount < 0
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
          </span>
        </div>
      </div>

      {socialMetrics && !variableBonus && (
        <div className="border-bg-subtle mt-4 rounded-xl border bg-neutral-100 p-2.5">
          <Button
            text="Add variable bonus"
            onClick={addVariableBonus}
            variant="secondary"
            icon={<ArrowTurnRight2 className="size-4 text-neutral-900" />}
            className="h-8 rounded-lg"
          />
        </div>
      )}

      {variableBonus && (
        <SocialMetricsVariableBonus
          variableBonus={variableBonus}
          metricLabel={metricLabel}
          onUpdate={updateVariableBonus}
          onRemove={removeVariableBonus}
        />
      )}
    </div>
  );
}

function SocialMetricsVariableBonus({
  variableBonus,
  metricLabel,
  onUpdate,
  onRemove,
}: SocialMetricsVariableBonusProps) {
  return (
    <div className="border-border-subtle mt-4 overflow-hidden rounded-xl border bg-neutral-100 p-2.5 pt-0 shadow-sm">
      <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-2 px-2">
          <ArrowTurnRight2 className="size-4 text-neutral-800" />
          <span className="text-sm font-medium text-neutral-800">
            Variable bonus
          </span>
          <Tooltip
            content="Partners earn the base payout when they hit the threshold, plus an extra amount for each additional increment up to the cap."
            side="top"
          >
            <div className="text-neutral-400 hover:text-neutral-600">
              <HelpCircle className="size-3.5" />
            </div>
          </Tooltip>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-neutral-400 hover:text-neutral-600"
          aria-label="Remove variable bonus"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-0 rounded-xl border border-neutral-200 bg-white px-2.5 py-3">
        <div className="border-border-subtle rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-2.5 p-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
              <Megaphone className="size-4 text-neutral-800" />
            </div>
            <span className="text-content-emphasis text-sm font-medium leading-relaxed">
              For each additional{" "}
              <InlineBadgePopover
                text={
                  variableBonus.incrementalAmount != null &&
                  variableBonus.incrementalAmount >= 1
                    ? String(variableBonus.incrementalAmount)
                    : "amount"
                }
                invalid={
                  variableBonus.incrementalAmount == null ||
                  variableBonus.incrementalAmount < 1
                }
                buttonClassName={
                  variableBonus.incrementalAmount != null &&
                  variableBonus.incrementalAmount >= 1
                    ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                    : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
                }
              >
                <InlineBadgePopoverInput
                  type="number"
                  min={1}
                  value={
                    variableBonus.incrementalAmount != null
                      ? String(variableBonus.incrementalAmount)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    const num = raw === "" ? undefined : parseInt(raw, 10);
                    onUpdate({
                      incrementalAmount:
                        num === undefined || Number.isNaN(num)
                          ? undefined
                          : Math.max(1, num),
                    });
                  }}
                  placeholder="amount"
                />
              </InlineBadgePopover>{" "}
              {metricLabel}
            </span>
          </div>
        </div>
        <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
        <div className="border-border-subtle rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-2.5 p-2.5">
            <RewardIconSquare icon={MoneyBills2} />
            <span className="text-content-emphasis text-sm font-medium leading-relaxed">
              Pay{" "}
              <InlineBadgePopover
                text={
                  variableBonus.bonusAmount != null &&
                  !isNaN(variableBonus.bonusAmount) &&
                  variableBonus.bonusAmount >= 0
                    ? currencyFormatter(variableBonus.bonusAmount * 100, {
                        trailingZeroDisplay: "stripIfInteger",
                      })
                    : "amount"
                }
                invalid={
                  variableBonus.bonusAmount == null ||
                  isNaN(variableBonus.bonusAmount) ||
                  variableBonus.bonusAmount < 0
                }
                buttonClassName={
                  variableBonus.bonusAmount != null &&
                  !isNaN(variableBonus.bonusAmount) &&
                  variableBonus.bonusAmount >= 0
                    ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                    : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
                }
              >
                <VariableBonusAmountInput
                  value={variableBonus.bonusAmount}
                  onChange={(v) => onUpdate({ bonusAmount: v })}
                />
              </InlineBadgePopover>
            </span>
          </div>
        </div>
        <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
        <div className="border-border-subtle rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-2.5 p-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
              <Refresh2 className="size-4 text-neutral-800" />
            </div>
            <span className="text-content-emphasis text-sm font-medium leading-relaxed">
              Up to{" "}
              <InlineBadgePopover
                text={
                  variableBonus.capAmount != null &&
                  variableBonus.capAmount >= 1
                    ? String(variableBonus.capAmount)
                    : "amount"
                }
                invalid={
                  variableBonus.capAmount == null || variableBonus.capAmount < 1
                }
                buttonClassName={
                  variableBonus.capAmount != null &&
                  variableBonus.capAmount >= 1
                    ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                    : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
                }
              >
                <InlineBadgePopoverInput
                  type="number"
                  min={1}
                  value={
                    variableBonus.capAmount != null
                      ? String(variableBonus.capAmount)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    const num = raw === "" ? undefined : parseInt(raw, 10);
                    onUpdate({
                      capAmount:
                        num === undefined || Number.isNaN(num)
                          ? undefined
                          : Math.max(1, num),
                    });
                  }}
                  placeholder="amount"
                />
              </InlineBadgePopover>{" "}
              {metricLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariableBonusAmountInput({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const { setIsOpen } = useContext(InlineBadgePopoverContext);
  return (
    <div className="relative rounded-md shadow-sm">
      <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
        $
      </span>
      <input
        className="block w-full rounded-md border-neutral-300 px-1.5 py-1 pl-4 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm"
        type="number"
        min={0}
        step={0.01}
        value={value != null && !isNaN(value) && value >= 0 ? value : ""}
        onChange={(e) => {
          const raw = (e.target as HTMLInputElement).value;
          const num = raw === "" ? undefined : parseFloat(raw);
          onChange(
            num === undefined || Number.isNaN(num)
              ? undefined
              : Math.max(0, num),
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen?.(false);
          }
        }}
      />
      <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
        USD
      </span>
    </div>
  );
}
