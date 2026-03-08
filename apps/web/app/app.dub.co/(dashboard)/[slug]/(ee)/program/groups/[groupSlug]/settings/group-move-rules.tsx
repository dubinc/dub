"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { WorkflowCondition } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import {
  InlineBadgePopover,
  InlineBadgePopoverAmountInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { ArrowTurnRight2, Button, UserArrowRight, Users } from "@dub/ui";
import { currencyFormatter, nFormatter } from "@dub/utils";
import { X } from "lucide-react";
import { Fragment, useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

const ATTRIBUTES = [
  { key: "totalLeads", text: "total leads", type: "number" },
  { key: "totalConversions", text: "total conversions", type: "number" },
  { key: "totalSaleAmount", text: "total revenue", type: "currency" },
  { key: "totalCommissions", text: "total commissions", type: "currency" },
] as const;

type Attribute = (typeof ATTRIBUTES)[number];
type AttributeType = (typeof ATTRIBUTES)[number]["type"];
type RangeValue = { min: number; max?: number };
type ValueType = number | RangeValue | undefined;

const ATTRIBUTE_BY_KEY = Object.fromEntries(
  ATTRIBUTES.map(({ key, text, type }) => [key, { text, type }]),
);

const RANGE_SELECTOR_OPTIONS = [
  { text: "and no limit", value: "noLimit" },
  { text: "and less than", value: "lessThan" },
];

export function GroupMoveRules() {
  const { plan } = useWorkspace();

  const { control, watch } = useFormContext<{
    moveRules?: WorkflowCondition[];
  }>();

  const moveRules = watch("moveRules") ?? [];

  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
    update: updateRule,
  } = useFieldArray({
    control,
    name: "moveRules",
    shouldUnregister: false,
  });

  const usedAttributes = useMemo(
    () =>
      moveRules
        ?.map((r) => r.attribute)
        .filter((a): a is NonNullable<typeof a> => a != null),
    [moveRules],
  );

  const disableAddRuleButton = ruleFields.length >= ATTRIBUTES.length;

  const { canUseGroupMoveRule } = getPlanCapabilities(plan);

  return (
    <>
      {!canUseGroupMoveRule ? (
        <GroupMoveRuleUpsell />
      ) : ruleFields.length === 0 ? (
        <NoGroupRule />
      ) : (
        <div className="relative flex flex-col">
          {ruleFields.map((field, index) => {
            const rule = moveRules?.[index];
            if (!rule) {
              return null;
            }

            // Filter out attributes already used by other rules
            const availableAttributes = ATTRIBUTES.filter(
              (a) =>
                a.key === rule.attribute || !usedAttributes?.includes(a.key),
            );

            return (
              <Fragment key={field.id}>
                <GroupRule
                  index={index}
                  rule={rule}
                  availableAttributes={availableAttributes}
                  onUpdate={(updatedRule) => {
                    updateRule(index, {
                      ...rule,
                      ...updatedRule,
                    });
                  }}
                  onRemove={() => {
                    removeRule(index);
                  }}
                />

                <div className="ml-6 h-4 w-px bg-neutral-200" />
              </Fragment>
            );
          })}

          <GroupMoveTarget />
        </div>
      )}

      {canUseGroupMoveRule && (
        <Button
          text="Add rule"
          variant="secondary"
          className="mt-4 h-8 w-fit rounded-lg px-3"
          onClick={() => {
            appendRule({
              attribute: undefined,
              operator: "gte",
              value: undefined,
            } as unknown as WorkflowCondition);
          }}
          disabled={disableAddRuleButton}
          disabledTooltip={
            disableAddRuleButton
              ? "All rules are in use. Delete existing rules."
              : undefined
          }
        />
      )}
    </>
  );
}

function GroupRule({
  rule,
  onUpdate,
  onRemove,
  index,
  availableAttributes,
}: {
  rule: WorkflowCondition;
  onUpdate: (updates: Partial<WorkflowCondition>) => void;
  onRemove: () => void;
  index: number;
  availableAttributes: Attribute[];
}) {
  const isFirst = index === 0;
  const attributeType = ATTRIBUTE_BY_KEY[rule.attribute]?.type || "number";

  // Determine if "and less than" is selected based on operator
  // If operator is "between", it means "and less than" was selected (even if max is not set yet)
  const isLessThanSelected = rule.operator === "between";
  const selectedRangeValue = isLessThanSelected ? "lessThan" : "noLimit";
  const selectedRangeOption = RANGE_SELECTOR_OPTIONS.find(
    ({ value }) => value === selectedRangeValue,
  );

  const handleRangeSelectorChange = (value: "noLimit" | "lessThan") => {
    const currentMin = getMinValue(rule.value);

    if (value === "noLimit") {
      onUpdate({
        operator: "gte",
        value: currentMin ?? undefined,
      });
    } else {
      // Only set min if we have an actual value, otherwise create empty range
      if (currentMin != null && currentMin > 0) {
        onUpdate({
          operator: "between",
          value: {
            min: currentMin,
          } as any,
        });
      } else {
        // Create range object without min (will be set when user enters value)
        onUpdate({
          operator: "between",
          value: {} as any,
        });
      }
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between p-2.5 pr-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
            {isFirst ? (
              <Users className="size-4 text-neutral-600" />
            ) : (
              <ArrowTurnRight2 className="size-4 text-neutral-600" />
            )}
          </div>
          <span className="text-sm font-medium text-neutral-800">
            {isFirst ? "If partner" : "And if partner"}
            {/* Select the attribute */}
            <InlineBadgePopover
              text={ATTRIBUTE_BY_KEY[rule.attribute]?.text || "activity"}
              invalid={!rule.attribute}
              buttonClassName="mx-1"
            >
              <InlineBadgePopoverMenu
                items={availableAttributes.map((a) => ({
                  value: a.key,
                  text: a.text,
                }))}
                selectedValue={rule.attribute}
                onSelect={(value) => {
                  // Reset to default gte operator when attribute changes
                  onUpdate({
                    ...rule,
                    attribute: value,
                    operator: "gte",
                    value: undefined,
                  });
                }}
              />
            </InlineBadgePopover>
            {/* Select the attribute value */}
            {rule.attribute && (
              <>
                is at least
                <InlineBadgePopover
                  text={formatValue(rule.value, attributeType, "min")}
                  invalid={
                    !rule.value ||
                    getMinValue(rule.value) == null ||
                    getMinValue(rule.value) === 0
                  }
                  buttonClassName="mx-1"
                >
                  <ValueInput
                    index={index}
                    rule={rule}
                    attributeType={attributeType}
                    part="min"
                    onUpdate={onUpdate}
                  />
                </InlineBadgePopover>
                {/* Range selector dropdown */}
                <InlineBadgePopover
                  text={selectedRangeOption?.text || "and no limit"}
                  buttonClassName="mx-1"
                >
                  <InlineBadgePopoverMenu
                    selectedValue={selectedRangeValue}
                    onSelect={handleRangeSelectorChange}
                    items={RANGE_SELECTOR_OPTIONS}
                  />
                </InlineBadgePopover>
                {/* Max value input (only shown when "and less than" is selected) */}
                {isLessThanSelected && (
                  <InlineBadgePopover
                    text={formatValue(rule.value, attributeType, "max")}
                    invalid={
                      getMaxValue(rule.value) == null ||
                      getMaxValue(rule.value) === 0
                    }
                    buttonClassName="mx-1"
                  >
                    <ValueInput
                      index={index}
                      rule={rule}
                      attributeType={attributeType}
                      part="max"
                      onUpdate={onUpdate}
                    />
                  </InlineBadgePopover>
                )}
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function GroupMoveTarget() {
  const { group, loading } = useGroup();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2.5 pr-3">
      <div className="flex size-7 items-center justify-center rounded-md bg-neutral-100">
        <UserArrowRight className="size-4 text-neutral-600" />
      </div>
      <span className="flex items-center gap-1 text-sm font-medium text-neutral-800">
        Move partner to
        <div className="flex h-5 items-center justify-center gap-2 rounded-md bg-neutral-100 px-1.5">
          {loading || !group ? (
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 animate-pulse rounded-full bg-neutral-200" />
              <span className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
            </span>
          ) : (
            <>
              <GroupColorCircle group={group} />
              <span className="text-content-default text-sm font-semibold">
                {group?.name}
              </span>
            </>
          )}
        </div>
      </span>
    </div>
  );
}

function NoGroupRule() {
  return (
    <div className="flex h-24 w-full flex-col items-center justify-center rounded-lg bg-neutral-50">
      <UserArrowRight className="size-4 text-neutral-600" />
      <p className="mt-2 text-sm font-normal text-neutral-500">
        No group move rules set
      </p>
    </div>
  );
}

function GroupMoveRuleUpsell() {
  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal();

  return (
    <>
      {partnersUpgradeModal}
      <div className="flex h-40 w-full flex-col items-center justify-center space-y-4 rounded-lg bg-neutral-50 py-1.5">
        <UserArrowRight className="size-4 text-neutral-600" />
        <p className="text-sm font-normal text-neutral-500">
          Make managing partner groups even easier
        </p>
        <Button
          onClick={() => setShowPartnersUpgradeModal(true)}
          text="Upgrade to Advanced"
          className="h-9 w-fit rounded-lg px-3"
        />
      </div>
    </>
  );
}

function ValueInput({
  index,
  rule,
  attributeType,
  part,
  onUpdate,
}: {
  index: number;
  rule: WorkflowCondition;
  attributeType: AttributeType;
  part: "min" | "max";
  onUpdate: (updates: Partial<WorkflowCondition>) => void;
}) {
  const { control } = useFormContext<{
    moveRules?: WorkflowCondition[];
  }>();

  const isCurrency = attributeType === "currency";
  const isMin = part === "min";

  return (
    <Controller
      control={control}
      name={`moveRules.${index}.value`}
      render={({ field }) => {
        const currentValue = isMin
          ? getMinValue(field.value)
          : getMaxValue(field.value);
        const displayValue = convertToDisplayValue(currentValue, isCurrency);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const inputValue = e.target.value;

          if (inputValue === "") {
            field.onChange(handleClearValue(field.value, isMin));
            return;
          }

          const convertedValue = convertFromDisplayValue(
            inputValue,
            isCurrency,
          );

          const newValue = isMin
            ? handleUpdateMinValue(field.value, convertedValue, rule.operator)
            : handleUpdateMaxValue(
                field.value,
                convertedValue,
                onUpdate,
                rule.operator,
              );

          field.onChange(newValue);
        };

        return (
          <InlineBadgePopoverAmountInput
            type={attributeType}
            value={displayValue}
            onChange={handleChange}
            onBlur={field.onBlur}
          />
        );
      }}
    />
  );
}

const handleClearValue = (
  currentFieldValue: ValueType,
  isMin: boolean,
): ValueType | undefined => {
  if (!isRangeValue(currentFieldValue)) {
    return undefined;
  }

  const rangeValue = currentFieldValue as RangeValue;

  if (isMin) {
    // For min: keep max if valid, otherwise clear
    return rangeValue.max != null && rangeValue.max > 0
      ? ({ max: rangeValue.max } as any)
      : undefined;
  } else {
    // For max: keep min if valid, otherwise clear
    return rangeValue.min != null && rangeValue.min > 0
      ? ({ min: rangeValue.min } as any)
      : undefined;
  }
};

const handleUpdateMinValue = (
  currentFieldValue: ValueType,
  convertedValue: number,
  operator: WorkflowCondition["operator"],
): ValueType => {
  if (operator === "between" && isRangeValue(currentFieldValue)) {
    const rangeValue = currentFieldValue as RangeValue;
    return { ...rangeValue, min: convertedValue };
  }
  return convertedValue;
};

const handleUpdateMaxValue = (
  currentFieldValue: ValueType,
  convertedValue: number,
  onUpdate: (updates: Partial<WorkflowCondition>) => void,
  ruleOperator: WorkflowCondition["operator"],
): ValueType => {
  if (isRangeValue(currentFieldValue)) {
    const rangeValue = currentFieldValue as RangeValue;
    const min =
      rangeValue.min != null && rangeValue.min > 0 ? rangeValue.min : undefined;
    return (
      min != null ? { min, max: convertedValue } : { max: convertedValue }
    ) as any;
  }

  // Create range from current value
  const currentMin = getMinValue(currentFieldValue);
  const newRange =
    currentMin != null && currentMin > 0
      ? { min: currentMin, max: convertedValue }
      : { max: convertedValue };

  // Update operator if needed
  if (ruleOperator === "gte") {
    onUpdate({ operator: "between" });
  }

  return newRange as any;
};

const getMinValue = (value: ValueType): number | null => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && value !== null && value.min != null) {
    return value.min;
  }

  return null;
};

const getMaxValue = (value: ValueType): number | null => {
  if (typeof value === "object" && value !== null && value.max != null) {
    return value.max;
  }

  return null;
};

const isRangeValue = (value: ValueType): value is RangeValue => {
  return (
    typeof value === "object" &&
    value !== null &&
    ("min" in value || "max" in value)
  );
};

const convertToDisplayValue = (
  value: number | null,
  isCurrency: boolean,
): string => {
  if (value == null || value === 0) return "";
  return isCurrency ? String(value / 100) : String(value);
};

const convertFromDisplayValue = (
  displayValue: string,
  isCurrency: boolean,
): number => {
  const numValue = Number(displayValue);
  return isCurrency ? numValue * 100 : numValue;
};

// Format the value based on the attribute type
const formatValue = (
  value: ValueType,
  type: AttributeType | undefined,
  part: "min" | "max" = "min",
) => {
  const numValue = part === "min" ? getMinValue(value) : getMaxValue(value);

  // Show placeholder if value is null, undefined, or 0
  if (numValue == null || numValue === 0) {
    return part === "min" ? "value" : "limit";
  }

  if (type === "currency") {
    return currencyFormatter(Number(numValue), {
      trailingZeroDisplay: "stripIfInteger",
    });
  }

  if (type === "number") {
    return nFormatter(numValue);
  }

  return String(numValue);
};
