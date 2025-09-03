import { DiscountProps, RewardProps } from "@/lib/types";
import { ProgramRewardList } from "../program-reward-list";

export function LanderRewards({
  rewards,
  discount,
  className,
}: {
  rewards: RewardProps[];
  discount: DiscountProps | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="mb-2 text-base font-semibold text-neutral-800">Rewards</h2>
      <ProgramRewardList
        rewards={rewards}
        discount={discount}
        className="bg-neutral-100"
      />
    </div>
  );
}
