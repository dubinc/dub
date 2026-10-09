"use client";

import {
  SEND_CAMPAIGN_ATTRIBUTES,
  SEND_CAMPAIGN_ATTRIBUTE_KEYS,
  SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS,
  SEND_CAMPAIGN_OPERATORS,
  SEND_CAMPAIGN_OPERATOR_KEYS,
  type SendCampaignAttributeKey,
} from "@/lib/api/workflows/send-campaign/schema";
import { satisfiesExclusiveAttributeRules } from "@/lib/api/workflows/utils";
import { DurationPopoverContent } from "@/ui/shared/duration-popover-content";
import {
  InlineBadgePopover,
  InlineBadgePopoverAmountInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { Button } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { currencyFormatter, pluralize } from "@dub/utils";
import { ChangeEvent, useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { useCampaignFormContext } from "./campaign-form-context";

type SendCampaignOperatorKey = (typeof SEND_CAMPAIGN_OPERATOR_KEYS)[number];

function isSendCampaignEnrollmentAttribute(
  attribute: string,
): attribute is (typeof SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS)[number] {
  return (
    SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS as readonly string[]
  ).includes(attribute);
}

export function TransactionalCampaignLogic({ locked }: { locked: boolean }) {
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

  const availableAttributesToAdd = useMemo(() => {
    return SEND_CAMPAIGN_ATTRIBUTE_KEYS.filter((attribute) =>
      satisfiesExclusiveAttributeRules({
        attribute,
        usedAttributes,
        attributes: SEND_CAMPAIGN_ATTRIBUTES,
      }),
    );
  }, [usedAttributes]);

  return (
    <div className="flex w-full flex-col gap-1.5 px-2 py-1">
      {fields.map((field, index) => {
        const condition = triggerConditions[index];
        const availableAttributes = SEND_CAMPAIGN_ATTRIBUTE_KEYS.filter(
          (attribute) =>
            satisfiesExclusiveAttributeRules({
              attribute,
              usedAttributes,
              currentAttribute: condition?.attribute,
              attributes: SEND_CAMPAIGN_ATTRIBUTES,
            }),
        );

        return (
          <ConditionRow
            key={field.id}
            index={index}
            availableAttributes={availableAttributes}
            canRemove={!locked && fields.length > 1}
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

      {!locked && availableAttributesToAdd.length > 0 && (
        <Button
          type="button"
          text="Add condition"
          variant="secondary"
          className="mt-1.5 h-8 w-fit rounded-lg px-3"
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
        { shouldDirty: true },
      );
      setValue(`triggerConditions.${index}.operator`, "gte", {
        shouldDirty: true,
      });
    }

    prevAttributeRef.current = attribute;
  }, [attribute, index, setValue]);

  // Ensure partnerJoined always has value 0
  useEffect(() => {
    if (attribute === "partnerJoined" && value !== 0) {
      setValue(`triggerConditions.${index}.value`, 0, { shouldDirty: true });
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
              text={SEND_CAMPAIGN_ATTRIBUTES[field.value]?.label ?? "activity"}
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
              <ValueInput index={index} config={config} />
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
}: {
  index: number;
  config: { inputType?: string };
}) {
  const { control } = useCampaignFormContext();
  const isCurrency = config.inputType === "currency";

  return (
    <Controller
      control={control}
      name={`triggerConditions.${index}.value`}
      render={({ field }) => {
        const storedValue = field.value;
        const displayValue =
          isCurrency && storedValue ? storedValue / 100 : storedValue;
        const hasValue = storedValue !== null && storedValue !== undefined;

        return (
          <InlineBadgePopover
            text={
              hasValue
                ? isCurrency
                  ? currencyFormatter(storedValue, {
                      trailingZeroDisplay: "stripIfInteger",
                    })
                  : storedValue
                : "amount"
            }
            invalid={!hasValue}
          >
            <InlineBadgePopoverAmountInput
              type={isCurrency ? "currency" : "number"}
              value={displayValue ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const nextValue = e.target.value;

                if (nextValue === "") {
                  field.onChange(null as unknown as number);
                  return;
                }

                const numValue = +nextValue;
                field.onChange(
                  isCurrency ? Math.round(numValue * 100) : numValue,
                );
              }}
              onBlur={field.onBlur}
            />
          </InlineBadgePopover>
        );
      }}
    />
  );
}
