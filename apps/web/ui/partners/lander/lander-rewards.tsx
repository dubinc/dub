import { DiscountProps, RewardProps } from "@/lib/types";
import { ProgramRewardList } from "../program-reward-list";

export function LanderRewards({
  program,
}: {
  program: { rewards: RewardProps[]; defaultDiscount: DiscountProps | null };
}) {
  return (
    <div className="mt-4">
      <h2 className="mb-2 text-base font-semibold text-neutral-800">Rewards</h2>
      <ProgramRewardList
        rewards={program.rewards}
        discount={program.defaultDiscount}
        className="bg-neutral-100"
      />
    </div>
  );
}
