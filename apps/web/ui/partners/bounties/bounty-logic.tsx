import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import {
  PERFORMANCE_ACTIVITIES,
  PERFORMANCE_CURRENCY_ACTIVITIES,
} from "@/lib/zod/schemas/bounties";
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

export function BountyLogic({ className }: { className?: string }) {
  const { control, watch } = useAddEditBountyForm();

  const [activity, value] = watch([
    "performanceLogic.activity",
    "performanceLogic.value",
  ]);

  const isCurrency = PERFORMANCE_CURRENCY_ACTIVITIES.includes(activity);

  return (
    <div
      className={cn(
        "block flex w-full items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2",
        className,
      )}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        <Trophy className="size-4 text-neutral-800" />
      </div>
      <span className="text-content-emphasis text-sm font-medium leading-relaxed">
        When partner{" "}
        <Controller
          control={control}
          name="performanceLogic.activity"
          render={({ field }) => (
            <InlineBadgePopover
              text={field.value ?? "activity"}
              invalid={!field.value}
            >
              <InlineBadgePopoverMenu
                selectedValue={field.value}
                onSelect={field.onChange}
                items={PERFORMANCE_ACTIVITIES.map((activity) => ({
                  text: activity,
                  value: activity,
                }))}
              />
            </InlineBadgePopover>
          )}
        />
        {activity && (
          <>
            {" "}
            is at least{" "}
            <InlineBadgePopover
              text={
                value
                  ? isCurrency
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

  const activity = watch("performanceLogic.activity");

  const isCurrency = PERFORMANCE_CURRENCY_ACTIVITIES.includes(activity);

  const { setIsOpen } = useContext(InlineBadgePopoverContext);

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
        {...register("performanceLogic.value", {
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
