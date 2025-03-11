import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";
import { Calendar6, MoneyBills2 } from "@dub/ui/icons";
import { cn } from "@dub/utils";

export function DetailsGrid({
  reward,
  className,
}: {
  reward: RewardProps;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      {[
        {
          icon: MoneyBills2,
          title: "Commission",
          value: constructRewardAmount({
            amount: reward.amount,
            type: reward.type,
          }),
        },
        {
          icon: Calendar6,
          title: "Duration",
          value:
            reward.maxDuration === null
              ? "Lifetime"
              : reward.maxDuration === 0
                ? "1 month"
                : `${reward.maxDuration} months`,
        },
      ].map(({ icon: Icon, title, value }) => (
        <div key={title} className="rounded-xl bg-neutral-100 p-4">
          <Icon className="size-5 text-neutral-500" />
          <div className="mt-6">
            <p className="font-mono text-xl text-neutral-900">{value}</p>
            <p className="mt-0.5 text-sm text-neutral-500">{title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
