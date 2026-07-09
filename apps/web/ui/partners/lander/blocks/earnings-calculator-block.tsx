"use client";

import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { GroupProps } from "@/lib/types";
import { programLanderEarningsCalculatorBlockSchema } from "@/lib/zod/schemas/program-lander";
import { InvoiceDollar } from "@dub/ui";
import NumberFlow from "@number-flow/react";
import { useEffect, useId, useState } from "react";
import * as z from "zod/v4";
import { formatRewardDescription } from "../../format-reward-description";
import { BlockDescription } from "./block-description";
import { BlockTitle } from "./block-title";
import { WavePattern } from "./wave-pattern";

const DEFAULT_SLIDER_MIN = 1;
const DEFAULT_SLIDER_MAX = 50;
const DEFAULT_SLIDER_VALUE = 10;

export function EarningsCalculatorBlock({
  block,
  group,
  showTitleAndDescription = true,
}: {
  block: z.infer<typeof programLanderEarningsCalculatorBlockSchema>;
  group: Pick<GroupProps, "saleReward">;
  showTitleAndDescription?: boolean;
}) {
  const id = useId();
  const min = block.data.minSales ?? DEFAULT_SLIDER_MIN;
  const max = block.data.maxSales ?? Math.max(DEFAULT_SLIDER_MAX, min);
  const sliderMin = max < min ? DEFAULT_SLIDER_MIN : min;
  const sliderMax = max < min ? DEFAULT_SLIDER_MAX : max;
  const [value, setValue] = useState(() =>
    Math.min(Math.max(DEFAULT_SLIDER_VALUE, sliderMin), sliderMax),
  );

  useEffect(() => {
    setValue((current) => Math.min(Math.max(current, sliderMin), sliderMax));
  }, [sliderMin, sliderMax]);

  if (!group?.saleReward) return null;

  const rewardAmount = getRewardAmount(group.saleReward);
  const revenue = value * ((block.data.productPrice || 30_00) / 100);

  const isYearly = block.data.billingPeriod === "yearly";

  const monthlyEarnings = Math.floor(
    group.saleReward.type === "flat"
      ? (value * rewardAmount) / 100
      : revenue * (rewardAmount / 100),
  );

  const displayEarnings = isYearly ? monthlyEarnings * 12 : monthlyEarnings;
  const sliderProgress =
    sliderMax === sliderMin
      ? 100
      : ((value - sliderMin) / (sliderMax - sliderMin)) * 100;

  return (
    <div className="space-y-5">
      {showTitleAndDescription && (
        <div className="space-y-2">
          <BlockTitle title="Earnings calculator" />
          <BlockDescription description="See how much you could earn by referring customers to our program." />
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6">
        {/* Earnings display */}
        <div className="relative flex flex-col pt-3">
          <span className="absolute left-0 top-0 text-sm font-semibold leading-5 text-neutral-700">
            You can earn
          </span>
          <div className="flex items-baseline">
            <NumberFlow
              value={displayEarnings}
              className="text-5xl font-medium leading-[48px] tracking-[-0.96px] text-neutral-800"
              prefix="$"
            />
            {block.data.billingPeriod !== "one-time" && (
              <span className="text-base font-semibold leading-6 tracking-[-0.32px] text-neutral-700">
                / {isYearly ? "year" : "month"}
              </span>
            )}
          </div>
        </div>

        {/* Slider section */}
        <div className="relative overflow-hidden rounded-[10px] border border-neutral-100 bg-neutral-50 p-5">
          <WavePattern />
          <div className="relative z-10 flex flex-col gap-5">
            <p
              id={`${id}-label`}
              className="text-base font-medium leading-6 tracking-[-0.32px] text-neutral-500"
            >
              <NumberFlow value={value} /> customer sales
            </p>
            <input
              id={`${id}-slider`}
              type="range"
              aria-labelledby={`${id}-label`}
              min={sliderMin}
              max={sliderMax}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="earnings-slider w-full"
              style={{
                background: `linear-gradient(to right, #262626 ${sliderProgress}%, #e5e5e5 ${sliderProgress}%)`,
              }}
            />
            <div className="flex items-center gap-1">
              <InvoiceDollar className="size-3.5 text-neutral-500" />
              <p className="text-xs font-normal leading-4 tracking-[-0.24px] text-neutral-500">
                {formatRewardDescription(group.saleReward)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
