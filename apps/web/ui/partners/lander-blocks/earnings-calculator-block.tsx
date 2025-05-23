"use client";

import { RewardProps } from "@/lib/types";
import { programLanderEarningsCalculatorBlockSchema } from "@/lib/zod/schemas/program-lander";
import { InvoiceDollar } from "@dub/ui";
import NumberFlow from "@number-flow/react";
import { useId, useState } from "react";
import { z } from "zod";
import { formatRewardDescription } from "../format-reward-description";
import { BlockTitle } from "./BlockTitle";

export function EarningsCalculatorBlock({
  block,
  reward,
}: {
  block: z.infer<typeof programLanderEarningsCalculatorBlockSchema>;
  reward?: RewardProps;
}) {
  const id = useId();

  const [value, setValue] = useState(10);
  const revenue = value * (block.data.productPrice / 100);

  return reward && reward.event === "sale" ? (
    <div>
      <BlockTitle title={block.data.title} />
      <div className="mt-5 rounded-lg border border-neutral-200 bg-white">
        <div className="p-4 sm:p-8">
          <label
            htmlFor={`${id}-slider`}
            className="text-base font-semibold text-neutral-700"
          >
            Customer sales
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
            className="mt-4 w-full accent-black"
          />
          <div className="mt-2 flex items-center gap-1">
            <InvoiceDollar className="size-3.5 text-neutral-400" />
            <p className="text-xs text-neutral-500">
              {formatRewardDescription({ reward })}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center border-t border-neutral-200 bg-neutral-100 p-4 font-semibold text-neutral-800/60 sm:p-8">
          <span>You can earn</span>
          <NumberFlow
            value={Math.floor(
              reward.type === "flat"
                ? reward.amount / 100
                : revenue * (reward.amount / 100),
            )}
            className="text-4xl font-medium text-neutral-800"
            prefix="$"
          />
          <span>every month</span>
        </div>
      </div>
    </div>
  ) : null;
}
