"use client";

import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import { WORKFLOW_ATTRIBUTES } from "@/lib/zod/schemas/workflows";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { Trophy } from "@dub/ui/icons";
import { cn, currencyFormatter } from "@dub/utils";
import { Controller } from "react-hook-form";
import { BountyAmountInput } from "./bounty-amount-input";
import { useBountyFormContext } from "./bounty-form-context";

export function BountyLogic({ className }: { className?: string }) {
  const { control, watch } = useBountyFormContext();

  const [attribute, value] = watch([
    "performanceCondition.attribute",
    "performanceCondition.value",
  ]);

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
              <InlineBadgePopover text={field.value} invalid={!field.value}>
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={[
                    { text: "new", value: "new" },
                    { text: "lifetime", value: "lifetime" },
                  ]}
                />
              </InlineBadgePopover>
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
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={WORKFLOW_ATTRIBUTES.filter(
                    (attr) => PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[attr],
                  ).map((attribute) => ({
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
            is at least{" "}
            <InlineBadgePopover
              text={
                value
                  ? isCurrencyAttribute(attribute)
                    ? currencyFormatter(value * 100, {
                        trailingZeroDisplay: "stripIfInteger",
                      })
                    : value
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
