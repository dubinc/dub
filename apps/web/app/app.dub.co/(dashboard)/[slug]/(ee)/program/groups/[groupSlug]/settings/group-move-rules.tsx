"use client";

import {
  GROUP_MOVE_ATTRIBUTES,
  GROUP_MOVE_METRIC_ATTRIBUTE_KEYS,
  GROUP_MOVE_OPERATORS,
} from "@/lib/api/workflows/move-group/schema";
import type {
  GroupMoveAttribute,
  GroupMoveAttributeKey,
  GroupMoveRules as GroupMoveRulesForm,
} from "@/lib/api/workflows/move-group/types";
import { WorkflowCondition } from "@/lib/api/workflows/types";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useGroup from "@/lib/swr/use-group";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAdvancedUpsellModal } from "@/ui/partners/advanced-upsell-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  InlineBadgePopover,
  InlineBadgePopoverAmountInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { ArrowTurnRight2, Button, UserArrowRight, Users } from "@dub/ui";
import { currencyFormatter, nFormatter, pluralize } from "@dub/utils";
import { X } from "lucide-react";
import { Fragment, useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

// Draft form value shapes (partial ranges allowed while editing)
type RangeValue = { min: number; max?: number };
type ValueType = number | RangeValue | string | string[] | undefined;

type MetricAttributeKey = (typeof GROUP_MOVE_METRIC_ATTRIBUTE_KEYS)[number];

const RANGE_SELECTOR_OPTIONS = [
  { text: "and no limit", value: "noLimit" },
  { text: "and less than", value: "lessThan" },
];

const PARTNER_GROUP_OPERATORS = ["eq", "ne", "in", "notIn"] as const;

const isMultiGroupOperator = (
  operator: WorkflowCondition["operator"],
): boolean => operator === "in" || operator === "notIn";

const isPartnerGroupRule = (rule: WorkflowCondition | undefined) =>
  rule?.attribute === "partnerGroup";

export function GroupMoveRules() {
  const { plan } = useWorkspace();

  const { control, watch } = useFormContext<{
    moveRules?: GroupMoveRulesForm;
  }>();

  const moveRules = watch("moveRules") ?? [];

  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
    update: updateRule,
    replace: replaceRules,
  } = useFieldArray({
    control,
    name: "moveRules",
    shouldUnregister: false,
  });

  const metricRuleIndexes = useMemo(
    () =>
      moveRules
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => !isPartnerGroupRule(rule)),
    [moveRules],
  );

  const partnerGroupRuleIndex = useMemo(
    () => moveRules.findIndex((rule) => isPartnerGroupRule(rule)),
    [moveRules],
  );

  const hasPartnerGroupCondition = partnerGroupRuleIndex !== -1;

  const usedMetricAttributes = useMemo(
    () =>
      metricRuleIndexes
        .map(({ rule }) => rule.attribute)
        .filter((a): a is NonNullable<typeof a> => a != null),
    [metricRuleIndexes],
  );

  const canAddMetricRule =
    usedMetricAttributes.length < GROUP_MOVE_METRIC_ATTRIBUTE_KEYS.length;

  // Source group is only an additional condition after at least one metric rule
  const canAddPartnerGroupCondition =
    metricRuleIndexes.length > 0 && !hasPartnerGroupCondition;

  const { canUseGroupMoveRule } = getPlanCapabilities(plan);

  const handleRemoveRule = (index: number) => {
    const removingLastMetric =
      !isPartnerGroupRule(moveRules[index]) &&
      metricRuleIndexes.length === 1 &&
      hasPartnerGroupCondition;

    if (removingLastMetric) {
      // Partner group can only exist as a second condition
      replaceRules([]);
      return;
    }

    removeRule(index);
  };

  return (
    <>
      {!canUseGroupMoveRule ? (
        <GroupMoveRuleUpsell />
      ) : ruleFields.length === 0 ? (
        <NoGroupRule />
      ) : (
        <div className="relative flex flex-col">
          {metricRuleIndexes.map(({ rule, index }, metricIndex) => {
            const availableAttributes = GROUP_MOVE_METRIC_ATTRIBUTE_KEYS.filter(
              (attribute) =>
                attribute === rule.attribute ||
                !usedMetricAttributes.includes(attribute),
            );
            const isFirstMetric = metricIndex === 0;

            return (
              <Fragment key={ruleFields[index]?.id ?? index}>
                <MetricGroupRule
                  index={index}
                  rule={rule}
                  metricIndex={metricIndex}
                  availableAttributes={availableAttributes}
                  onUpdate={(updatedRule) => {
                    updateRule(index, {
                      ...rule,
                      ...updatedRule,
                    });
                  }}
                  onRemove={() => handleRemoveRule(index)}
                  nestedCondition={
                    isFirstMetric
                      ? hasPartnerGroupCondition
                        ? {
                            rule: moveRules[partnerGroupRuleIndex]!,
                            onUpdate: (updatedRule) => {
                              updateRule(partnerGroupRuleIndex, {
                                ...moveRules[partnerGroupRuleIndex],
                                ...updatedRule,
                              });
                            },
                            onRemove: () => removeRule(partnerGroupRuleIndex),
                          }
                        : canAddPartnerGroupCondition
                          ? {
                              onAdd: () => {
                                appendRule({
                                  attribute: "partnerGroup",
                                  operator: "eq",
                                  value: undefined,
                                } as unknown as WorkflowCondition);
                              },
                            }
                          : undefined
                      : undefined
                  }
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
          disabled={!canAddMetricRule && ruleFields.length > 0}
          disabledTooltip={
            !canAddMetricRule && ruleFields.length > 0
              ? "All rules are in use. Delete existing rules."
              : undefined
          }
        />
      )}
    </>
  );
}

function MetricGroupRule({
  rule,
  onUpdate,
  onRemove,
  nestedCondition,
  index,
  metricIndex,
  availableAttributes,
}: {
  rule: WorkflowCondition;
  onUpdate: (updates: Partial<WorkflowCondition>) => void;
  onRemove: () => void;
  nestedCondition?:
    | { onAdd: () => void }
    | {
        rule: WorkflowCondition;
        onUpdate: (updates: Partial<WorkflowCondition>) => void;
        onRemove: () => void;
      };
  index: number;
  metricIndex: number;
  availableAttributes: MetricAttributeKey[];
}) {
  const isFirst = metricIndex === 0;
  const attributeConfig = rule.attribute
    ? GROUP_MOVE_ATTRIBUTES[rule.attribute as GroupMoveAttributeKey]
    : undefined;
  const attributeType = attributeConfig?.inputType || "number";

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
    <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_2px_4px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between p-2.5 pr-3">
        <div className="flex items-center gap-2.5">
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
              text={attributeConfig?.label || "activity"}
              invalid={!rule.attribute}
              buttonClassName="mx-1"
            >
              <InlineBadgePopoverMenu
                items={availableAttributes.map((attribute) => ({
                  value: attribute,
                  text: GROUP_MOVE_ATTRIBUTES[attribute].label,
                }))}
                selectedValue={rule.attribute}
                onSelect={(value) => {
                  onUpdate({
                    ...rule,
                    attribute: value,
                    operator: "gte",
                    value: undefined,
                  });
                }}
              />
            </InlineBadgePopover>
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

      {nestedCondition && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-100 px-2.5 pb-2.5">
          <div className="pt-2.5">
            {"onAdd" in nestedCondition ? (
              <Button
                text="Add condition"
                variant="secondary"
                className="h-8 w-full justify-center gap-2 rounded-lg border-neutral-200 bg-white px-3 hover:bg-neutral-50"
                icon={<ArrowTurnRight2 className="size-4" />}
                onClick={nestedCondition.onAdd}
              />
            ) : (
              <PartnerGroupCondition
                rule={nestedCondition.rule}
                onUpdate={nestedCondition.onUpdate}
                onRemove={nestedCondition.onRemove}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PartnerGroupCondition({
  rule,
  onUpdate,
  onRemove,
}: {
  rule: WorkflowCondition;
  onUpdate: (updates: Partial<WorkflowCondition>) => void;
  onRemove: () => void;
}) {
  const { group: currentGroup } = useGroup();
  const { groups } = useGroups();

  const availableGroups = useMemo(
    () => groups?.filter((g) => g.id !== currentGroup?.id) ?? [],
    [groups, currentGroup?.id],
  );

  const isMulti = isMultiGroupOperator(rule.operator);
  const selectedOperator = PARTNER_GROUP_OPERATORS.includes(
    rule.operator as (typeof PARTNER_GROUP_OPERATORS)[number],
  )
    ? rule.operator
    : "eq";

  const selectedGroupIds = useMemo(() => {
    if (typeof rule.value === "string") {
      return [rule.value];
    }
    if (Array.isArray(rule.value)) {
      return rule.value;
    }
    return [];
  }, [rule.value]);

  const selectedGroups = useMemo(
    () => (groups ?? []).filter((group) => selectedGroupIds.includes(group.id)),
    [groups, selectedGroupIds],
  );

  const groupBadgeText = (() => {
    if (selectedGroups.length === 0) {
      return isMulti ? "select groups" : "select group";
    }

    if (isMulti && selectedGroups.length > 1) {
      return (
        <span className="inline-flex items-center gap-2">
          <span className="flex items-center">
            {selectedGroups.slice(0, 2).map((group, index) => (
              <span
                key={group.id}
                className={index > 0 ? "-ml-1.5" : undefined}
              >
                <GroupColorCircle group={group} />
              </span>
            ))}
          </span>
          {selectedGroups.length} Partner{" "}
          {pluralize("Group", selectedGroups.length)}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5">
        <GroupColorCircle group={selectedGroups[0]} />
        {selectedGroups[0].name}
      </span>
    );
  })();

  const handleOperatorSelect = (
    operator: (typeof PARTNER_GROUP_OPERATORS)[number],
  ) => {
    const nextIsMulti = isMultiGroupOperator(operator);
    const wasMulti = isMultiGroupOperator(rule.operator);

    let nextValue: string | string[] | undefined;

    if (nextIsMulti === wasMulti) {
      nextValue = rule.value as string | string[] | undefined;
    } else if (nextIsMulti) {
      nextValue =
        typeof rule.value === "string" && rule.value ? [rule.value] : [];
    } else {
      nextValue =
        Array.isArray(rule.value) && rule.value.length > 0
          ? rule.value[0]
          : undefined;
    }

    onUpdate({
      operator,
      value: nextValue as any,
    });
  };

  const handleGroupSelect = (groupId: string) => {
    if (isMulti) {
      const current = Array.isArray(rule.value) ? rule.value : [];
      const next = current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId];
      onUpdate({ value: next as any });
      return;
    }

    onUpdate({ value: groupId });
  };

  return (
    <div className="flex items-center justify-between rounded-[10px] border border-neutral-200 bg-white p-2.5 pr-3 shadow-[0_2px_2px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
          <ArrowTurnRight2 className="size-4 text-neutral-600" />
        </div>
        <span className="text-sm font-medium text-neutral-800">
          And if partner group
          <InlineBadgePopover
            text={
              GROUP_MOVE_OPERATORS[
                selectedOperator as keyof typeof GROUP_MOVE_OPERATORS
              ]?.label ?? "condition"
            }
            buttonClassName="mx-1"
          >
            <InlineBadgePopoverMenu
              selectedValue={selectedOperator}
              onSelect={handleOperatorSelect}
              items={PARTNER_GROUP_OPERATORS.map((operator) => ({
                value: operator,
                text: GROUP_MOVE_OPERATORS[operator].label,
              }))}
            />
          </InlineBadgePopover>
          <InlineBadgePopover
            text={groupBadgeText}
            invalid={selectedGroupIds.length === 0}
            buttonClassName="mx-1"
          >
            <InlineBadgePopoverMenu
              search
              selectedValue={isMulti ? selectedGroupIds : selectedGroupIds[0]}
              onSelect={handleGroupSelect}
              items={availableGroups.map((group) => ({
                value: group.id,
                text: group.name,
                icon: <GroupColorCircle group={group} />,
              }))}
            />
          </InlineBadgePopover>
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
  const { advancedUpsellModal, setShowAdvancedUpsellModal } =
    useAdvancedUpsellModal();

  return (
    <>
      {advancedUpsellModal}
      <div className="flex h-40 w-full flex-col items-center justify-center space-y-4 rounded-lg bg-neutral-50 py-1.5">
        <UserArrowRight className="size-4 text-neutral-600" />
        <p className="text-sm font-normal text-neutral-500">
          Make managing partner groups even easier
        </p>
        <Button
          onClick={() => setShowAdvancedUpsellModal(true)}
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
  attributeType: GroupMoveAttribute["inputType"];
  part: "min" | "max";
  onUpdate: (updates: Partial<WorkflowCondition>) => void;
}) {
  const { control } = useFormContext<{
    moveRules?: GroupMoveRulesForm;
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
            type={attributeType === "currency" ? "currency" : "number"}
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

  if (isRangeValue(value) && value.min != null) {
    return value.min;
  }

  return null;
};

const getMaxValue = (value: ValueType): number | null => {
  if (isRangeValue(value) && value.max != null) {
    return value.max;
  }

  return null;
};

const isRangeValue = (value: ValueType): value is RangeValue => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
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
  type: GroupMoveAttribute["inputType"] | undefined,
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
