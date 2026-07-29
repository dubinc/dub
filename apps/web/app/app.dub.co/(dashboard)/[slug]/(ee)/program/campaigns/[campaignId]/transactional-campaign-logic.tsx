"use client";

import {
  SEND_CAMPAIGN_ATTRIBUTES,
  SEND_CAMPAIGN_ATTRIBUTE_KEYS,
  SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS,
  SEND_CAMPAIGN_OPERATORS,
  SEND_CAMPAIGN_OPERATOR_KEYS,
} from "@/lib/api/workflows/send-campaign/schema";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { DurationPopoverContent } from "@/ui/shared/duration-popover-content";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { Button } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { cn, currencyFormatter, pluralize } from "@dub/utils";
import { useContext, useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { useCampaignFormContext } from "./campaign-form-context";

type SendCampaignAttributeKey = (typeof SEND_CAMPAIGN_ATTRIBUTE_KEYS)[number];
type SendCampaignOperatorKey = (typeof SEND_CAMPAIGN_OPERATOR_KEYS)[number];

function isSendCampaignEnrollmentAttribute(
  attribute: string,
): attribute is (typeof SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS)[number] {
  return (
    SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS as readonly string[]
  ).includes(attribute);
}

export function TransactionalCampaignLogic() {
  const { control, watch } = useCampaignFormContext();

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "triggerConditions",
  });

  const triggerConditions = watch("triggerConditions") ?? [];

  const usedAttributes = useMemo(
    () =>
      triggerConditions
        .map((condition) => condition?.attribute)
        .filter((attribute): attribute is SendCampaignAttributeKey =>
          Boolean(attribute),
        ),
    [triggerConditions],
  );

  const hasEnrollmentAttribute = usedAttributes.some(
    isSendCampaignEnrollmentAttribute,
  );

  const availableAttributesToAdd = useMemo(() => {
    return SEND_CAMPAIGN_ATTRIBUTE_KEYS.filter((attribute) => {
      if (usedAttributes.includes(attribute)) {
        return false;
      }

      if (
        hasEnrollmentAttribute &&
        isSendCampaignEnrollmentAttribute(attribute)
      ) {
        return false;
      }

      return true;
    });
  }, [usedAttributes, hasEnrollmentAttribute]);

  const canAddCondition =
    fields.length > 0 && availableAttributesToAdd.length > 0;

  return (
    <div className="flex w-full flex-col gap-1.5 px-2 py-1">
      {fields.map((field, index) => {
        const condition = triggerConditions[index];
        const availableAttributes = SEND_CAMPAIGN_ATTRIBUTE_KEYS.filter(
          (attribute) => {
            if (
              attribute === condition?.attribute ||
              !usedAttributes.includes(attribute)
            ) {
              if (
                isSendCampaignEnrollmentAttribute(attribute) &&
                hasEnrollmentAttribute &&
                condition?.attribute !== attribute
              ) {
                return false;
              }
              return true;
            }
            return false;
          },
        );

        return (
          <ConditionRow
            key={field.id}
            index={index}
            availableAttributes={availableAttributes}
            canRemove={fields.length > 1}
            onRemove={() => remove(index)}
            onUpdate={(updates) => {
              update(index, {
                ...condition,
                ...updates,
              });
            }}
          />
        );
      })}

      {canAddCondition && (
        <Button
          type="button"
          text="Add condition"
          variant="secondary"
          className="text-content-emphasis mt-1.5 h-8 w-fit rounded-lg text-xs font-medium"
          onClick={() => {
            const nextAttribute = availableAttributesToAdd[0];
            append({
              attribute: nextAttribute,
              operator: "gte",
              value:
                nextAttribute === "partnerJoined"
                  ? 0
                  : (null as unknown as number),
            });
          }}
        />
      )}
    </div>
  );
}

function ConditionRow({
  index,
  availableAttributes,
  canRemove,
  onRemove,
  onUpdate,
}: {
  index: number;
  availableAttributes: readonly SendCampaignAttributeKey[];
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (updates: {
    attribute?: SendCampaignAttributeKey;
    operator?: SendCampaignOperatorKey;
    value?: number;
  }) => void;
}) {
  const { control, watch, setValue } = useCampaignFormContext();

  const attribute = watch(`triggerConditions.${index}.attribute`);
  const value = watch(`triggerConditions.${index}.value`);
  const prevAttributeRef = useRef(attribute);

  const config = attribute ? SEND_CAMPAIGN_ATTRIBUTES[attribute] : null;
  const isEnrollment = attribute
    ? isSendCampaignEnrollmentAttribute(attribute)
    : false;
  const allowedOperators = config?.operators ?? (["gte"] as const);

  // Reset value when attribute changes
  useEffect(() => {
    if (prevAttributeRef.current && prevAttributeRef.current !== attribute) {
      setValue(
        `triggerConditions.${index}.value`,
        attribute === "partnerJoined" ? 0 : (null as any),
      );
      setValue(`triggerConditions.${index}.operator`, "gte");
    }

    prevAttributeRef.current = attribute;
  }, [attribute, index, setValue]);

  // Ensure partnerJoined always has value 0
  useEffect(() => {
    if (attribute === "partnerJoined" && value !== 0) {
      setValue(`triggerConditions.${index}.value`, 0);
    }
  }, [attribute, value, index, setValue]);

  return (
    <div className="flex items-start gap-1">
      <span className="text-content-default flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm font-medium leading-relaxed">
        {index === 0 ? "When partner" : "And when partner"}
        {config?.inputType !== "none" && "'s"}
        <Controller
          control={control}
          name={`triggerConditions.${index}.attribute`}
          render={({ field }) => (
            <InlineBadgePopover
              text={
                field.value
                  ? SEND_CAMPAIGN_ATTRIBUTES[field.value].label
                  : "activity"
              }
              invalid={!field.value}
            >
              <InlineBadgePopoverMenu
                selectedValue={field.value}
                onSelect={(nextAttribute) => {
                  field.onChange(nextAttribute);
                  onUpdate({
                    attribute: nextAttribute as SendCampaignAttributeKey,
                    operator: "gte",
                    value:
                      nextAttribute === "partnerJoined"
                        ? 0
                        : (null as unknown as number),
                  });
                }}
                items={availableAttributes.map((attr) => ({
                  text: SEND_CAMPAIGN_ATTRIBUTES[attr].label,
                  value: attr,
                }))}
              />
            </InlineBadgePopover>
          )}
        />

        {config && config.inputType !== "none" && (
          <>
            {isEnrollment ? (
              <>reaches at least</>
            ) : (
              <Controller
                control={control}
                name={`triggerConditions.${index}.operator`}
                render={({ field }) => (
                  <InlineBadgePopover
                    text={
                      field.value
                        ? SEND_CAMPAIGN_OPERATORS[
                            field.value as SendCampaignOperatorKey
                          ]?.label
                        : "at least"
                    }
                    invalid={!field.value}
                  >
                    <InlineBadgePopoverMenu
                      selectedValue={field.value}
                      onSelect={field.onChange}
                      items={allowedOperators.map((op) => ({
                        text: SEND_CAMPAIGN_OPERATORS[op].label,
                        value: op,
                      }))}
                    />
                  </InlineBadgePopover>
                )}
              />
            )}{" "}
            {config.inputType === "dropdown" ? (
              <DropdownValueInput index={index} config={config} />
            ) : (
              <ValueInput index={index} config={config} value={value} />
            )}
          </>
        )}
      </span>

      {canRemove && (
        <Button
          type="button"
          variant="secondary"
          onClick={onRemove}
          icon={<Xmark className="size-3.5" />}
          className="h-6 w-[26px] shrink-0 px-1.5"
          aria-label="Remove condition"
        />
      )}
    </div>
  );
}

function DropdownValueInput({
  index,
  config,
}: {
  index: number;
  config: { dropdownValues?: readonly number[] };
}) {
  const { control } = useCampaignFormContext();

  return (
    <Controller
      control={control}
      name={`triggerConditions.${index}.value`}
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
            <DurationPopoverContent
              value={field.value ?? undefined}
              onChange={field.onChange}
              presetDurations={
                config.dropdownValues ? Array.from(config.dropdownValues) : []
              }
              presetsOnly
              unit="days"
              minValue={1}
            />
          </InlineBadgePopover>
          {pluralize("day", field.value || 1)}
        </>
      )}
    />
  );
}

function ValueInput({
  index,
  config,
  value,
}: {
  index: number;
  config: { inputType?: string };
  value: number | null | undefined;
}) {
  const { watch, setValue } = useCampaignFormContext();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const storedValue = watch(`triggerConditions.${index}.value`);

  const isCurrency = config.inputType === "currency";

  const displayValue =
    isCurrency && storedValue ? storedValue / 100 : storedValue;

  const hasValue = value !== null && value !== undefined;

  return (
    <InlineBadgePopover
      text={
        hasValue
          ? isCurrency
            ? currencyFormatter(value, {
                trailingZeroDisplay: "stripIfInteger",
              })
            : value
          : "amount"
      }
      invalid={!hasValue}
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
            const nextValue = e.target.value;
            if (nextValue === "") {
              setValue(`triggerConditions.${index}.value`, null as any);
            } else {
              const numValue = +nextValue;
              setValue(
                `triggerConditions.${index}.value`,
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
