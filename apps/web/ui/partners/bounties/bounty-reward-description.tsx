import { getBountyRewardDescription } from "@/lib/bounty/get-bounty-reward-description";
import { BountyProps } from "@/lib/types";
import { Gift } from "@dub/ui";
import { cn } from "@dub/utils";
import { BountyIncrementalBonusTooltip } from "./bounty-incremental-bonus-tooltip";

export function BountyRewardDescription({
  bounty,
  className,
  onTooltipClick,
}: {
  bounty: Pick<
    BountyProps,
    "rewardAmount" | "rewardDescription" | "submissionRequirements"
  >;
  className?: string;
  onTooltipClick?: (e: React.MouseEvent) => void; // Prevent the tooltip from being clicked when the reward description is clicked
}) {
  const description = getBountyRewardDescription(bounty);

  if (!description) {
    return null;
  }

  return (
    <div
      className={cn(
        "text-content-subtle flex items-center gap-1 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Gift className="size-3.5 shrink-0" />
        <span>{description}</span>
      </div>

      <BountyIncrementalBonusTooltip
        bounty={bounty}
        onTooltipClick={onTooltipClick}
      />
    </div>
  );
}
