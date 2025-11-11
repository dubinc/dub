import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { CAMPAIGN_WORKFLOW_ATTRIBUTE_CONFIG } from "@/lib/zod/schemas/campaigns";
import { WORKFLOW_ATTRIBUTES } from "@/lib/zod/schemas/workflows";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { cn, currencyFormatter, pluralize } from "@dub/utils";
import { useContext, useEffect, useRef } from "react";
import { Controller } from "react-hook-form";
import { useCampaignFormContext } from "./campaign-form-context";

export function TransactionalCampaignLogic() {
  const { control, watch, setValue } = useCampaignFormContext();

  const attribute = watch("triggerCondition.attribute");
  const value = watch("triggerCondition.value");
  const prevAttributeRef = useRef(attribute);

  const config = attribute
    ? CAMPAIGN_WORKFLOW_ATTRIBUTE_CONFIG[attribute]
    : null;

  // Reset value when attribute changes
  useEffect(() => {
    if (prevAttributeRef.current && prevAttributeRef.current !== attribute) {
      // Set value to 0 for partnerJoined, null for others
      setValue(
        "triggerCondition.value",
        attribute === "partnerJoined" ? 0 : (null as any),
      );
    }

    prevAttributeRef.current = attribute;
  }, [attribute, setValue]);

  // Ensure partnerJoined always has value 0
  useEffect(() => {
    if (attribute === "partnerJoined" && value !== 0) {
      setValue("triggerCondition.value", 0);
    }
  }, [attribute, value, setValue]);

  return (
    <div className="flex h-8 w-full items-center px-2">
      <span className="text-content-default flex gap-1 text-sm font-medium leading-relaxed">
        When partner{config?.inputType !== "none" && "'s"}
        <div className="inline-flex items-center gap-1">
          <Controller
            control={control}
            name="triggerCondition.attribute"
            render={({ field }) => (
              <InlineBadgePopover
                text={
                  field.value
                    ? CAMPAIGN_WORKFLOW_ATTRIBUTE_CONFIG[field.value].label
                    : "activity"
                }
                invalid={!field.value}
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={WORKFLOW_ATTRIBUTES.map((attr) => ({
                    text: CAMPAIGN_WORKFLOW_ATTRIBUTE_CONFIG[attr].label,
                    value: attr,
                  }))}
                />
              </InlineBadgePopover>
            )}
          />

          {config && config.inputType !== "none" && (
            <>
              reaches at least{" "}
              {config.inputType === "dropdown" ? (
                <DropdownValueInput config={config} />
              ) : (
                <ValueInput config={config} value={value} />
              )}
            </>
          )}
        </div>
      </span>
    </div>
  );
}

function DropdownValueInput({
  config,
}: {
  config: { dropdownValues?: number[] };
}) {
  const { control } = useCampaignFormContext();

  return (
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
            invalid={field.value === undefined || field.value === null}
          >
            <InlineBadgePopoverMenu
              selectedValue={
                field.value !== undefined && field.value !== null
                  ? String(field.value)
                  : "1"
              }
              onSelect={(val) => field.onChange(Number(val))}
              items={(config.dropdownValues || []).map((val) => ({
                text: String(val),
                value: String(val),
              }))}
            />
          </InlineBadgePopover>
          {pluralize("day", field.value || 1)}
        </>
      )}
    />
  );
}

function ValueInput({
  config,
  value,
}: {
  config: { inputType?: string };
  value: number | null | undefined;
}) {
  const { watch, setValue } = useCampaignFormContext();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const storedValue = watch("triggerCondition.value");

  const isCurrency = config.inputType === "currency";

  const displayValue =
    isCurrency && storedValue ? storedValue / 100 : storedValue;

  return (
    <InlineBadgePopover
      text={
        value ? (isCurrency ? currencyFormatter(value) : value) : "amount"
      }
      invalid={!value}
    >
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
    </InlineBadgePopover>
  );
}
