"use client";

import useProgram from "@/lib/swr/use-program";
import useRewards from "@/lib/swr/use-rewards";
import { Reward as RewardType } from "@dub/prisma/client";
import { Badge, MoneyBill } from "@dub/ui";

export function RewardSettings() {
  return (
    <div className="flex flex-col gap-6">
      <SaleReward />
      <AdditionalRewards />
    </div>
  );
}

const SaleReward = () => {
  const { program } = useProgram();
  const { rewards, loading } = useRewards();
  const defaultReward =
    program?.defaultRewardId &&
    rewards?.find((r) => r.id === program.defaultRewardId);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
            Sale Reward <Badge variant="gray">Default</Badge>
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            The default rewarded offered to all partners
          </p>
        </div>
        {loading ? (
          <div className="flex h-[100px] items-center justify-center">
            <div className="text-sm text-neutral-500">
              Loading default reward...
            </div>
          </div>
        ) : program?.defaultRewardId ? (
          defaultReward ? (
            <Reward reward={defaultReward} />
          ) : (
            <div className="flex h-[100px] items-center justify-center">
              <div className="text-sm text-neutral-500">
                Loading default reward...
              </div>
            </div>
          )
        ) : (
          <div className="flex h-[100px] items-center justify-center">
            <div className="text-sm text-neutral-500">
              No default reward set
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdditionalRewards = () => {
  const { program } = useProgram();
  const { rewards, loading } = useRewards();
  const additionalRewards = rewards?.filter(
    (reward) => reward.id !== program?.defaultRewardId
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
            Additional Rewards
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Add more reward types or reward groups
          </p>
        </div>
        {loading ? (
          <div className="flex h-[100px] items-center justify-center">
            <div className="text-sm text-neutral-500">Loading rewards...</div>
          </div>
        ) : additionalRewards && additionalRewards.length > 0 ? (
          <div className="flex flex-col gap-4">
            {additionalRewards.map((reward) => (
              <Reward key={reward.id} reward={reward} />
            ))}
          </div>
        ) : (
          <div className="flex h-[100px] items-center justify-center">
            <div className="text-sm text-neutral-500">
              No additional rewards found
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Reward = ({ reward }: { reward: RewardType }) => {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white">
        <MoneyBill className="size-5 text-neutral-600" />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal">
            Earn{" "}
            <span className="text-blue-500">
              {reward.type === "percentage"
                ? `${reward.amount}%`
                : `$${(reward.amount / 100).toFixed(2)}`}
            </span>{" "}
            for each {reward.event.toLowerCase()}
            {reward.maxDuration && (
              <>
                , and again for {reward.maxDuration}{" "}
                {reward.maxDuration === 0 ? "forever" : "months"}
              </>
            )}
          </span>
        </div>
        <Badge variant="gray">All partners</Badge>
      </div>
    </div>
  );
};
