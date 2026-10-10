import { isEventBasedReward } from "@/lib/api/rewards/custom-reward-utils";
import { useWatch } from "react-hook-form";
import { ProgramRewardDescription } from "../program-reward-description";
import {
  getRewardPayload,
  useAddEditRewardForm,
} from "./add-edit-reward-sheet";
import { REWARD_EVENT_ICON } from "./reward-event-icon";
import { getRewardQuality, RewardQualityIndicator } from "./reward-quality";

export function RewardPreviewCard() {
  const { control } = useAddEditRewardForm();

  const data = useWatch({ control });

  let reward: ReturnType<typeof getRewardPayload> | null = null;
  try {
    reward = getRewardPayload({ data: data as any });
  } catch (error) {
    return null;
  }

  const Icon = REWARD_EVENT_ICON[reward.event];
  const type = data.type ?? reward.type;
  const hasConditions = !!data.modifiers?.length;
  const quality = getRewardQuality({
    event: reward.event,
    type,
    amountInCents:
      type === "flat" &&
      data.amountInCents != null &&
      !Number.isNaN(data.amountInCents)
        ? data.amountInCents * 100
        : null,
    amountInPercentage:
      type === "percentage" &&
      data.amountInPercentage != null &&
      !Number.isNaN(data.amountInPercentage)
        ? data.amountInPercentage
        : null,
    maxDuration: data.maxDuration,
  });

  return (
    <div className="border-border-subtle bg-bg-muted rounded-xl border shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-content-emphasis flex items-center gap-2.5 text-sm font-semibold">
          Reward preview
        </span>
        {isEventBasedReward(reward) && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">
              {hasConditions ? "Base reward quality" : "Reward quality"}
            </span>
            <RewardQualityIndicator
              event={reward.event}
              quality={quality}
              tooltipFooter={
                hasConditions ? "Based on default reward only" : undefined
              }
            />
          </div>
        )}
      </div>

      <div className="border-border-subtle bg-bg-default -mx-px rounded-xl border-x border-t p-4">
        <div className="text-content-default flex items-center gap-2">
          <Icon className="size-4 shrink-0" />
          <span className="text-sm font-normal">
            <ProgramRewardDescription reward={reward} />
          </span>
        </div>
      </div>
    </div>
  );
}
