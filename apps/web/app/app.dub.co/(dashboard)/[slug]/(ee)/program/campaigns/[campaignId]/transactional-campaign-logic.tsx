import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS } from "@/lib/zod/schemas/campaigns";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { cn, currencyFormatter } from "@dub/utils";
import { useContext } from "react";
import { Controller } from "react-hook-form";
import { useCampaignFormContext } from "./campaign-form-context";

export function TransactionalCampaignLogic() {
  const { control, watch } = useCampaignFormContext();

  const [attribute, operator, value] = watch([
    "triggerCondition.attribute",
    "triggerCondition.operator",
    "triggerCondition.value",
  ]);

  return (
    <div className="flex w-full items-center">
      <span className="text-content-emphasis flex gap-1 text-sm font-medium leading-relaxed">
        When partner has
        <div className="inline-flex items-center gap-1">
          <Controller
            control={control}
            name="triggerCondition.attribute"
            render={({ field }) => (
              <InlineBadgePopover
                text={
                  field.value
                    ? CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS[field.value]
                    : "activity"
                }
                invalid={!field.value}
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={Object.entries(CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS).map(
                    ([key, value]) => ({
                      text: value,
                      value: key,
                    }),
                  )}
                />
              </InlineBadgePopover>
            )}
          />

          {/* <Controller
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
                  items={WORKFLOW_ATTRIBUTES.map((attribute) => ({
                    text: WORKFLOW_ATTRIBUTE_LABELS[attribute].toLowerCase(),
                    value: attribute,
                  }))}
                />
              </InlineBadgePopover>
            )}
          /> */}
        </div>
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
      </span>
    </div>
  );
}

function ValueInput() {
  const { watch, register } = useCampaignFormContext();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const attribute = watch("triggerCondition.attribute");
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
        {...register("triggerCondition.value", {
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
