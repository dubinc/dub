"use client";

import type { SocialMetricsChannel } from "@/lib/constants/bounties";
import {
  SOCIAL_METRICS_CHANNELS,
  SOCIAL_METRICS_CHANNEL_METRICS,
} from "@/lib/constants/bounties";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import {
  InlineBadgePopover,
  InlineBadgePopoverInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { Megaphone, MoneyBills2 } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { BountyAmountInput } from "./bounty-amount-input";
import { useAddEditBountyForm } from "./bounty-form-context";

export function BountySocialMetricsCriteriaCards() {
  const { watch, setValue } = useAddEditBountyForm();
  const submissionRequirements = watch("submissionRequirements") as {
    socialMetrics?: {
      channel: SocialMetricsChannel;
      metric: string;
      amount: number;
    };
  } | null;
  const rewardAmount = watch("rewardAmount");
  const socialMetrics = submissionRequirements?.socialMetrics ?? {
    channel: "youtube" as SocialMetricsChannel,
    metric: "likes",
    amount: 100,
  };

  const updateSocialMetrics = (
    updates: Partial<{
      channel: SocialMetricsChannel;
      metric: string;
      amount: number;
    }>,
  ) => {
    const nextChannel = updates.channel ?? socialMetrics.channel;
    const channelMetrics = SOCIAL_METRICS_CHANNEL_METRICS[nextChannel];
    const nextMetric =
      updates.metric ??
      (channelMetrics.some((m) => m.value === socialMetrics.metric)
        ? socialMetrics.metric
        : channelMetrics[0].value);
    const nextAmount = updates.amount ?? socialMetrics.amount;
    setValue(
      "submissionRequirements",
      {
        socialMetrics: {
          channel: nextChannel,
          metric: nextMetric,
          amount: nextAmount,
        },
      },
      { shouldDirty: true },
    );
  };

  const channelLabel =
    SOCIAL_METRICS_CHANNELS.find((c) => c.value === socialMetrics.channel)
      ?.label ?? socialMetrics.channel;
  const metricLabel =
    SOCIAL_METRICS_CHANNEL_METRICS[socialMetrics.channel]?.find(
      (m) => m.value === socialMetrics.metric,
    )?.label ?? socialMetrics.metric;

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
              buttonClassName="!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
            >
              <InlineBadgePopoverMenu
                items={SOCIAL_METRICS_CHANNELS.map((c) => ({
                  value: c.value,
                  text: c.label,
                }))}
                selectedValue={socialMetrics.channel}
                onSelect={(v) =>
                  updateSocialMetrics({ channel: v as SocialMetricsChannel })
                }
              />
            </InlineBadgePopover>{" "}
            has{" "}
            <InlineBadgePopover
              text={
                socialMetrics.amount != null && socialMetrics.amount > 0
                  ? String(socialMetrics.amount)
                  : "amount"
              }
              invalid={socialMetrics.amount == null || socialMetrics.amount < 1}
              buttonClassName={
                socialMetrics.amount != null && socialMetrics.amount >= 1
                  ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                  : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
              }
            >
              <InlineBadgePopoverInput
                type="number"
                min={1}
                value={
                  socialMetrics.amount == null || socialMetrics.amount === 0
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
                placeholder="100"
              />
            </InlineBadgePopover>{" "}
            <InlineBadgePopover
              text={metricLabel}
              buttonClassName="!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
            >
              <InlineBadgePopoverMenu
                items={SOCIAL_METRICS_CHANNEL_METRICS[
                  socialMetrics.channel
                ].map((m) => ({ value: m.value, text: m.label }))}
                selectedValue={socialMetrics.metric}
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
    </div>
  );
}
