import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";
import {
  CONDITION_OPERATOR_LABELS,
  rewardConditionsArraySchema,
} from "@/lib/zod/schemas/rewards";
import { ArrowTurnRight2, InfoTooltip } from "@dub/ui";
import { capitalize, cn, pluralize, truncate } from "@dub/utils";
import { Fragment } from "react";
import { z } from "zod";

export function ProgramRewardModifiersTooltip({
  reward,
}: {
  reward?: Pick<
    RewardProps,
    "amount" | "type" | "event" | "maxDuration" | "modifiers"
  > | null;
}) {
  if (!reward?.modifiers?.length) return null;

  return (
    <div className="inline-block align-text-top">
      <InfoTooltip
        content={
          <div
            className={cn(
              "block max-w-xs text-pretty p-3 text-left text-xs font-medium text-neutral-600",
            )}
          >
            <strong className="font-semibold">
              <span className="text-content-default">
                {constructRewardAmount({
                  amount: reward.amount,
                  type: reward.type,
                })}
              </span>{" "}
              per {reward.event}
              {reward.event === "sale" && (
                <>
                  {" "}
                  {reward.maxDuration === 0
                    ? "one time"
                    : reward.maxDuration === Infinity ||
                        reward.maxDuration === null
                      ? "for the customer's lifetime"
                      : `for ${reward.maxDuration} ${pluralize("month", Number(reward.maxDuration))}`}
                </>
              )}
            </strong>

            {(
              reward.modifiers as z.infer<typeof rewardConditionsArraySchema>
            ).map(({ amount, type, operator, conditions }, idx) => (
              <Fragment key={idx}>
                <div className="mt-1 flex items-start gap-1.5">
                  <ArrowTurnRight2 className="mt-0.5 size-3 shrink-0" />
                  <div className="min-w-0">
                    <strong className="text-content-default font-semibold">
                      {constructRewardAmount({
                        amount,
                        type,
                      })}
                    </strong>
                    <ul className="overflow-hidden pl-1 text-xs text-neutral-600">
                      {conditions.map((condition, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="shrink-0 text-lg leading-none">
                            &bull;
                          </span>
                          <span className="min-w-0 truncate">
                            {idx === 0
                              ? "If"
                              : capitalize(operator.toLowerCase())}
                            {` ${condition.entity}`}
                            {` ${condition.attribute}`}
                            {` ${CONDITION_OPERATOR_LABELS[condition.operator]}`}
                            {` ${condition.value && truncate(Array.isArray(condition.value) ? condition.value.join(", ") : condition.value.toString(), 16)}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        }
      />
    </div>
  );
}
