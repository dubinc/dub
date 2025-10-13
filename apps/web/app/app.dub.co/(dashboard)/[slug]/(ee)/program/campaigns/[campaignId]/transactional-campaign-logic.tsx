import {
  isCurrencyAttribute,
  isDaysAttribute,
} from "@/lib/api/workflows/utils";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import {
  ALLOWED_ATTRIBUTE_VALUES_IN_DAYS,
  CAMPAIGN_WORKFLOW_ATTRIBUTES,
} from "@/lib/zod/schemas/campaigns";
import { WORKFLOW_ATTRIBUTE_LABELS } from "@/lib/zod/schemas/workflows";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { cn, currencyFormatter, pluralize } from "@dub/utils";
import { useContext } from "react";
import { Controller } from "react-hook-form";
import { useCampaignFormContext } from "./campaign-form-context";

export function TransactionalCampaignLogic() {
  const { control, watch } = useCampaignFormContext();

  const attribute = watch("triggerCondition.attribute");
  const value = watch("triggerCondition.value");

  return (
    <div className="flex h-8 w-full items-center px-2">
      <span className="text-content-default flex gap-1 text-sm font-medium leading-relaxed">
        When partner's
        <div className="inline-flex items-center gap-1">
          <Controller
            control={control}
            name="triggerCondition.attribute"
            render={({ field }) => (
              <InlineBadgePopover
                text={
                  field.value
                    ? WORKFLOW_ATTRIBUTE_LABELS[field.value].toLowerCase()
                    : "activity"
                }
                invalid={!field.value}
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={CAMPAIGN_WORKFLOW_ATTRIBUTES.map((attr) => ({
                    text: WORKFLOW_ATTRIBUTE_LABELS[attr].toLowerCase(),
                    value: attr,
                  }))}
                />
              </InlineBadgePopover>
            )}
          />

          {attribute && (
            <>
              {isDaysAttribute(attribute) ? (
                <Controller
                  control={control}
                  name="triggerCondition.value"
                  render={({ field }) => (
                    <>
                      <InlineBadgePopover
                        text={
                          field.value !== undefined && field.value !== null
                            ? String(field.value)
                            : "1"
                        }
                        invalid={
                          field.value === undefined || field.value === null
                        }
                      >
                        <InlineBadgePopoverMenu
                          selectedValue={
                            field.value !== undefined && field.value !== null
                              ? String(field.value)
                              : "1"
                          }
                          onSelect={(val) => field.onChange(Number(val))}
                          items={ALLOWED_ATTRIBUTE_VALUES_IN_DAYS.filter(
                            (days) => days !== 0,
                          ).map((days) => ({
                            text: String(days),
                            value: String(days),
                          }))}
                        />
                      </InlineBadgePopover>
                      {pluralize("day", field.value || 1)}
                    </>
                  )}
                />
              ) : (
                <>
                  is at least{" "}
                  <InlineBadgePopover
                    text={
                      value
                        ? isCurrencyAttribute(attribute)
                          ? currencyFormatter(value / 100)
                          : value
                        : "amount"
                    }
                    invalid={!value}
                  >
                    <ValueInput />
                  </InlineBadgePopover>
                </>
              )}
            </>
          )}
        </div>
      </span>
    </div>
  );
}

function ValueInput() {
  const { watch, register, setValue } = useCampaignFormContext();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const attribute = watch("triggerCondition.attribute");
  const storedValue = watch("triggerCondition.value");
  const isCurrency = isCurrencyAttribute(attribute);

  // Display value in dollars for currency, but store in cents
  const displayValue =
    isCurrency && storedValue ? storedValue / 100 : storedValue;

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
        value={displayValue ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "") {
            setValue("triggerCondition.value", null as any);
          } else {
            const numValue = +value;
            setValue(
              "triggerCondition.value",
              isCurrency ? Math.round(numValue * 100) : numValue,
            );
          }
          if (isCurrency) {
            handleMoneyInputChange(e);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
            return;
          }

          if (isCurrency) {
            handleMoneyKeyDown(e);
          }
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
