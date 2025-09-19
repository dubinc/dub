import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { WorkflowConditionAttribute } from "@/lib/types";
import { WORKFLOW_ATTRIBUTES } from "@/lib/zod/schemas/workflows";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { Trophy } from "@dub/ui/icons";
import { cn, currencyFormatter } from "@dub/utils";
import { useAddEditBountyForm } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/bounties/add-edit-bounty-sheet";
import { useContext } from "react";
import { Controller } from "react-hook-form";

const WORKFLOW_ATTRIBUTE_LABELS: Record<WorkflowConditionAttribute, string> = {
  totalLeads: "total leads",
  totalConversions: "total conversions",
  totalSaleAmount: "total revenue",
  totalCommissions: "total commissions",
} as const;

export function BountyLogic({ className }: { className?: string }) {
  const { control, watch } = useAddEditBountyForm();

  const [attribute, value] = watch([
    "performanceCondition.attribute",
    "performanceCondition.value",
  ]);

  return (
    <div
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2",
        className,
      )}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        <Trophy className="size-4 text-neutral-800" />
      </div>
      <span className="text-content-emphasis text-sm font-medium leading-relaxed">
        When partner{" "}
        <div className="inline-flex items-center gap-1">
          <Controller
            control={control}
            name="currentStatsOnly"
            render={({ field }) => (
              <InlineBadgePopover
                text={
                  field.value === true
                    ? "new"
                    : field.value === false
                      ? "all-time"
                      : "type"
                }
                invalid={field.value === undefined || field.value === null}
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={[
                    { text: "new", value: true },
                    { text: "all-time", value: false },
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
                    ? WORKFLOW_ATTRIBUTE_LABELS[field.value]
                    : "activity"
                }
                invalid={!field.value}
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={WORKFLOW_ATTRIBUTES.map((attribute) => ({
                    text: WORKFLOW_ATTRIBUTE_LABELS[attribute],
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
                    ? currencyFormatter(value)
                    : value
                  : "amount"
              }
              invalid={!value}
            >
              <ValueInput />
            </InlineBadgePopover>
          </>
        )}
      </span>
    </div>
  );
}

function ValueInput() {
  const { watch, register } = useAddEditBountyForm();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const attribute = watch("performanceCondition.attribute");
  const isCurrency = isCurrencyAttribute(attribute);

  return (
    <div className="relative rounded-md shadow-sm">
      {isCurrency && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
      )}
      <input
        className={cn(
          "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm",
          isCurrency ? "pl-4 pr-12" : "pr-7",
        )}
        {...register("performanceCondition.value", {
          required: true,
          setValueAs: (value: string) => (value === "" ? undefined : +value),
          min: 0,
          onChange: handleMoneyInputChange,
        })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
            return;
          }

          handleMoneyKeyDown(e);
        }}
      />
      {isCurrency && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
          USD
        </span>
      )}
    </div>
  );
}
