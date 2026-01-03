"use client";

import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { GroupProps } from "@/lib/types";
import { programLanderEarningsCalculatorBlockSchema } from "@/lib/zod/schemas/program-lander";
import { InvoiceDollar } from "@dub/ui";
import NumberFlow from "@number-flow/react";
import { useId, useState } from "react";
import * as z from "zod/v4";
import { formatRewardDescription } from "../../format-reward-description";
import { BlockDescription } from "./block-description";
import { BlockTitle } from "./block-title";

export function EarningsCalculatorBlock({
  block,
  group,
  showTitleAndDescription = true,
}: {
  block: z.infer<typeof programLanderEarningsCalculatorBlockSchema>;
  group: Pick<GroupProps, "saleReward" | "brandColor">;
  showTitleAndDescription?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(10);

  if (!group?.saleReward) return null;

  const rewardAmount = getRewardAmount(group.saleReward);
  const revenue = value * ((block.data.productPrice || 30_00) / 100);

  return (
    <div className="space-y-5">
      {showTitleAndDescription && (
        <div className="space-y-2">
          <BlockTitle title="Earnings calculator" />
          <BlockDescription description="See how much you could earn by referring customers to our program." />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="p-4 sm:p-8">
          <label
            htmlFor={`${id}-slider`}
            className="text-base font-semibold text-neutral-700"
          >
            Customer referrals
          </label>
          <div className="mt-1.5">
            <NumberFlow
              value={value}
              className="text-2xl font-medium text-neutral-800"
            />
          </div>
          <input
            id={`${id}-slider`}
            type="range"
            min={1}
            max={50}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="mt-4 w-full"
            style={{ accentColor: group.brandColor || "black" }}
          />
          <div className="mt-2 flex items-center gap-1">
            <InvoiceDollar className="size-3.5 text-neutral-400" />
            <p className="text-xs text-neutral-500">
              {formatRewardDescription(group.saleReward)}
            </p>
          </div>
        </div>
        <div className="relative border-t border-neutral-200">
          <div
            className="absolute inset-0 opacity-5"
            style={{ backgroundColor: group.brandColor || "black" }}
          />
          <div className="flex flex-col items-center justify-center p-4 font-semibold text-neutral-800/60 sm:p-6">
            <span>You can earn</span>
            <NumberFlow
              value={Math.floor(
                group.saleReward.type === "flat"
                  ? (value * rewardAmount) / 100
                  : revenue * (rewardAmount / 100),
              )}
              className="text-4xl font-medium text-neutral-800"
              prefix="$"
            />
            <span>every month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
