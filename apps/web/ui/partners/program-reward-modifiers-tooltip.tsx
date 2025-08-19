import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";
import {
  ATTRIBUTE_LABELS,
  CONDITION_OPERATOR_LABELS,
  rewardConditionsArraySchema,
} from "@/lib/zod/schemas/rewards";
import { InfoTooltip } from "@dub/ui";
import { pluralize } from "@dub/utils";
import { z } from "zod";

export function ProgramRewardModifiersTooltip({
  reward,
}: {
  reward?: Pick<
    RewardProps,
    "amount" | "type" | "event" | "maxDuration" | "modifiers"
  > | null;
}) {
  if (!reward?.modifiers?.length) {
    return null;
  }

  return (
    <div className="inline-block align-text-top">
      <InfoTooltip
        content={
          <div className="max-w-sm space-y-2 p-3">
            <RewardItem reward={reward} />
            {(
              reward.modifiers as z.infer<typeof rewardConditionsArraySchema>
            ).map((modifier, idx) => (
              <div key={idx} className="space-y-2">
                <span className="flex w-full items-center justify-center rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                  OR
                </span>

                <RewardItem
                  reward={{
                    event: reward.event,
                    amount: modifier.amount,
                    type:
                      modifier.type === undefined ? reward.type : modifier.type, // fallback to primary
                    maxDuration:
                      modifier.maxDuration === undefined
                        ? reward.maxDuration
                        : modifier.maxDuration, // fallback to primary
                  }}
                  conditions={modifier.conditions}
                />
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}

const RewardItem = ({
  reward,
  conditions,
}: {
  reward: Pick<RewardProps, "amount" | "type" | "event" | "maxDuration">;
  conditions?: z.infer<
    typeof rewardConditionsArraySchema
  >[number]["conditions"];
}) => {
  const rewardAmount = constructRewardAmount({
    reward: {
      ...reward,
      modifiers: undefined,
    },
  });

  const durationText =
    reward.maxDuration === null
      ? "for the customer's lifetime"
      : reward.maxDuration === 0
        ? "one time"
        : reward.maxDuration && reward.maxDuration % 12 === 0
          ? `for ${reward.maxDuration / 12} ${pluralize(
              "year",
              reward.maxDuration / 12,
            )}`
          : reward.maxDuration
            ? `for ${reward.maxDuration} months`
            : "";

  return (
    <div>
      <div className="text-content-default text-xs font-semibold">
        {rewardAmount} per {reward.event}
        {reward.event === "sale" && durationText ? ` ${durationText}` : ""}
      </div>

      {conditions && conditions.length > 0 && (
        <ul className="ml-1 text-xs font-medium text-neutral-600">
          {conditions.map((condition, idx) => (
            <li key={idx} className="flex items-start gap-1">
              <span className="shrink-0 text-lg leading-none">&bull;</span>
              <span className="min-w-0 truncate">
                {idx === 0 ? "If" : "Or"} {condition.entity}{" "}
                {ATTRIBUTE_LABELS[condition.attribute]}{" "}
                {CONDITION_OPERATOR_LABELS[condition.operator]}{" "}
                {condition.value &&
                  (Array.isArray(condition.value)
                    ? condition.value.join(", ")
                    : condition.attribute === "productId" && condition.label
                      ? condition.label
                      : condition.value.toString())}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
