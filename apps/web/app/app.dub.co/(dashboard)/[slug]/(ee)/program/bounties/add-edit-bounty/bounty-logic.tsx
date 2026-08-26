"use client";

import {
  AWARD_BOUNTY_ATTRIBUTE_KEYS,
  AWARD_BOUNTY_OPERATORS,
} from "@/lib/api/workflows/award-bounty/schema";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { DynamicTooltipWrapper } from "@dub/ui";
import { Trophy } from "@dub/ui/icons";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import { BountyStartMode } from "@prisma/client";
import { useParams } from "next/navigation";
import { Controller } from "react-hook-form";
import { BountyAmountInput } from "./bounty-amount-input";
import { useBountyFormContext } from "./bounty-form-context";

const PERFORMANCE_SCOPE_DESCRIPTIONS = {
  new: "Only net-new stats after the bounty start date will be counted",
  lifetime: "Include the partner's historical stats in your program",
} as const;

export function BountyLogic({ className }: { className?: string }) {
  const { bountyId } = useParams();
  const isEditing = !!bountyId;

  const { control, watch } = useBountyFormContext();

  const [attribute, value, startMode] = watch([
    "performanceCondition.attribute",
    "performanceCondition.value",
    "startMode",
  ]);

  const isRelative = startMode === BountyStartMode.relative;

  return (
    <div className={cn("flex w-full items-center gap-1.5", className)}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        <Trophy className="size-4 text-neutral-800" />
      </div>
      <span className="text-content-emphasis text-sm font-medium leading-relaxed">
        When partner's{" "}
        <div className="inline-flex items-center gap-1">
          <Controller
            control={control}
            name="performanceScope"
            render={({ field }) => (
              <DynamicTooltipWrapper
                tooltipProps={
                  isEditing
                    ? {
                        content:
                          "Performance scope cannot be changed after bounty creation.",
                      }
                    : undefined
                }
              >
                <span>
                  <InlineBadgePopover
                    text={field.value}
                    invalid={!field.value}
                    align="center"
                    disabled={isEditing}
                  >
                    <InlineBadgePopoverMenu
                      selectedValue={field.value}
                      onSelect={field.onChange}
                      items={[
                        {
                          text: "new",
                          value: "new",
                          description: PERFORMANCE_SCOPE_DESCRIPTIONS.new,
                        },
                        {
                          text: isRelative
                            ? "lifetime (not available)"
                            : "lifetime",
                          value: "lifetime",
                          description: `${PERFORMANCE_SCOPE_DESCRIPTIONS.lifetime}${isRelative ? " (not available for relative start dates)" : ""}`,
                          disabled: isRelative,
                        },
                      ]}
                    />
                  </InlineBadgePopover>
                </span>
              </DynamicTooltipWrapper>
            )}
          />
          <Controller
            control={control}
            name="performanceCondition.attribute"
            render={({ field }) => (
              <InlineBadgePopover
                text={
                  field.value
                    ? PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[
                        field.value
                      ].toLowerCase()
                    : "activity"
                }
                invalid={!field.value}
                align="center"
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={AWARD_BOUNTY_ATTRIBUTE_KEYS.map((attribute) => ({
                    text: PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[
                      attribute
                    ].toLowerCase(),
                    value: attribute,
                  }))}
                />
              </InlineBadgePopover>
            )}
          />
        </div>
        {attribute && (
          <>
            {" "}
            is {AWARD_BOUNTY_OPERATORS.gte.label}{" "}
            <InlineBadgePopover
              text={
                value
                  ? isCurrencyAttribute(attribute)
                    ? currencyFormatter(value * 100, {
                        trailingZeroDisplay: "stripIfInteger",
                      })
                    : nFormatter(value, { full: true })
                  : "amount"
              }
              invalid={!value}
            >
              <BountyAmountInput
                name="performanceCondition.value"
                emptyValue={undefined}
              />
            </InlineBadgePopover>
          </>
        )}
      </span>
    </div>
  );
}
