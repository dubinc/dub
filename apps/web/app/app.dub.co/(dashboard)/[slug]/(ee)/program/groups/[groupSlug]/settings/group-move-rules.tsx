"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useGroup from "@/lib/swr/use-group";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps, WorkflowCondition } from "@/lib/types";
import {
  WORKFLOW_COMPARISON_OPERATOR_LABELS,
  WORKFLOW_ENUM_COMPARISON_OPERATORS,
} from "@/lib/zod/schemas/workflows";
import { useAdvancedUpsellModal } from "@/ui/partners/advanced-upsell-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  InlineBadgePopover,
  InlineBadgePopoverAmountInput,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import {
  ArrowTurnRight2,
  Button,
  Check2,
  UserArrowRight,
  Users,
} from "@dub/ui";
import { currencyFormatter, nFormatter, truncate } from "@dub/utils";
import { Command } from "cmdk";
import { X } from "lucide-react";
import { Fragment, useContext, useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

const PERFORMANCE_ATTRIBUTES = [
  { key: "totalLeads", text: "total leads", type: "number" },
  { key: "totalConversions", text: "total conversions", type: "number" },
  { key: "totalSaleAmount", text: "total revenue", type: "currency" },
  { key: "totalCommissions", text: "total commissions", type: "currency" },
] as const;

const PROFILE_ATTRIBUTES = [
  { key: "groupId", text: "group", type: "group" },
] as const;

const ATTRIBUTES = [...PERFORMANCE_ATTRIBUTES, ...PROFILE_ATTRIBUTES] as const;

type Attribute = (typeof ATTRIBUTES)[number];
type AttributeType = (typeof ATTRIBUTES)[number]["type"];
type RangeValue = { min: number; max?: number };
type ValueType = number | RangeValue | string | string[] | undefined;

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
          <span className="text-sm font-medium leading-relaxed text-neutral-800">
            {isFirst ? "If partner" : "And if partner"}
            {/* Select the attribute */}
            <InlineBadgePopover
              text={ATTRIBUTE_BY_KEY[rule.attribute]?.text || "Detail"}
              invalid={!rule.attribute}
              buttonClassName="mx-1"
            >
              <AttributeMenu
                attributes={availableAttributes}
                selectedValue={rule.attribute}
                onSelect={(value) => {
                  const isGroup = ATTRIBUTE_BY_KEY[value]?.type === "group";

                  // Reset the operator and value when the attribute changes
                  onUpdate({
                    ...rule,
                    attribute: value,
                    operator: (isGroup
                      ? undefined
                      : "gte") as WorkflowCondition["operator"],
                    value: undefined,
                  });
                }}
              />
            </InlineBadgePopover>
            {/* Select the condition + group(s) for group attributes */}
            {rule.attribute && attributeType === "group" && (
              <GroupConditionSelectors rule={rule} onUpdate={onUpdate} />
            )}
            {/* Select the attribute value */}
            {rule.attribute && attributeType !== "group" && (
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

function AttributeMenu({
  attributes,
  selectedValue,
  onSelect,
}: {
  attributes: Attribute[];
  selectedValue?: WorkflowCondition["attribute"];
  onSelect: (value: Attribute["key"]) => void;
}) {
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const sections = [
    {
      label: "Performance data",
      items: attributes.filter((a) => a.type !== "group"),
    },
    {
      label: "Profile data",
      items: attributes.filter((a) => a.type === "group"),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="-mx-1 box-border w-[calc(100%+0.5rem)] min-w-0 max-w-none">
      <Command loop className="w-full focus:outline-none">
        <Command.List className="scrollbar-hide flex max-h-64 w-full max-w-52 flex-col gap-1 overflow-y-auto transition-all">
          {sections.map((section, sectionIndex) => (
            <Fragment key={section.label}>
              {sectionIndex > 0 && (
                <div
                  className="bg-border-subtle mt-1 h-px w-full min-w-0 shrink-0"
                  role="separator"
                />
              )}
              <div className="text-content-subtle mx-2 py-2 text-xs font-medium">
                {section.label}
              </div>
              <div className="mx-1 flex flex-col gap-1">
                {section.items.map(({ key, text }) => (
                  <Command.Item
                    key={key}
                    value={`${text} ${key}`}
                    onSelect={() => {
                      onSelect(key);
                      setIsOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 transition-colors duration-150 data-[selected=true]:bg-neutral-100"
                  >
                    <span className="text-content-default pr-3 text-left text-sm font-medium">
                      {text}
                    </span>
                    {selectedValue === key && (
                      <Check2 className="text-content-emphasis size-3.5 shrink-0" />
                    )}
                  </Command.Item>
                ))}
              </div>
            </Fragment>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}

function GroupConditionSelectors({
  rule,
  onUpdate,
}: {
  rule: WorkflowCondition;
  onUpdate: (updates: Partial<WorkflowCondition>) => void;
}) {
  const { group: currentGroup } = useGroup();
  const { groups } = useGroups();

  const isEnumOperator = WORKFLOW_ENUM_COMPARISON_OPERATORS.includes(
    rule.operator as (typeof WORKFLOW_ENUM_COMPARISON_OPERATORS)[number],
  );
  const isMulti = rule.operator === "in" || rule.operator === "not_in";

  const selectedGroupIds = Array.isArray(rule.value)
    ? rule.value
    : typeof rule.value === "string" && rule.value
      ? [rule.value]
      : [];

  // Exclude the current group: partners already in it can't be moved to it
  const selectableGroups = (groups ?? []).filter(
    (group) => group.id !== currentGroup?.id,
  );

  return (
    <>
      <InlineBadgePopover
        text={
          isEnumOperator
            ? WORKFLOW_COMPARISON_OPERATOR_LABELS[rule.operator]
            : "Condition"
        }
        invalid={!isEnumOperator}
        buttonClassName="mx-1"
      >
        <InlineBadgePopoverMenu
          selectedValue={
            isEnumOperator
              ? (rule.operator as (typeof WORKFLOW_ENUM_COMPARISON_OPERATORS)[number])
              : undefined
          }
          items={WORKFLOW_ENUM_COMPARISON_OPERATORS.map((operator) => ({
            text: WORKFLOW_COMPARISON_OPERATOR_LABELS[operator],
            value: operator,
          }))}
          onSelect={(operator) => {
            const multi = operator === "in" || operator === "not_in";

            // Preserve the selection when switching between single and multi operators
            onUpdate({
              operator,
              value: (multi
                ? selectedGroupIds
                : selectedGroupIds[0]) as WorkflowCondition["value"],
            });
          }}
        />
      </InlineBadgePopover>
      {isEnumOperator && (
        <InlineBadgePopover
          text={formatGroupValue(selectedGroupIds, groups, isMulti)}
          invalid={selectedGroupIds.length === 0}
          buttonClassName="mx-1"
        >
          <InlineBadgePopoverMenu
            search
            selectedValue={isMulti ? selectedGroupIds : selectedGroupIds[0]}
            items={selectableGroups.map((group) => ({
              text: group.name,
              value: group.id,
              icon: <GroupColorCircle group={group} />,
            }))}
            onSelect={(groupId) => {
              if (isMulti) {
                const newGroupIds = selectedGroupIds.includes(groupId)
                  ? selectedGroupIds.filter((id) => id !== groupId)
                  : [...selectedGroupIds, groupId];

                onUpdate({ value: newGroupIds });
              } else {
                onUpdate({ value: groupId });
              }
            }}
          />
        </InlineBadgePopover>
      )}
    </>
  );
}

const formatGroupValue = (
  selectedGroupIds: string[],
  groups: GroupProps[] | undefined,
  isMulti: boolean,
) => {
  if (selectedGroupIds.length === 0) {
    return isMulti ? "Select groups" : "Select group";
  }

  if (!isMulti) {
    const group = groups?.find(({ id }) => id === selectedGroupIds[0]);

    if (!group) {
      return "Select group";
    }

    return (
      <span className="inline-flex items-center gap-1.5 align-middle">
        <GroupColorCircle group={group} />
        {truncate(group.name, 24)}
      </span>
    );
  }

  const names = selectedGroupIds.map(
    (groupId) => groups?.find(({ id }) => id === groupId)?.name ?? "…",
  );

  return (
    names
      .map((name) => truncate(name, 16))
      .slice(0, 2)
      .join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "")
  );
};

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
            type={isCurrency ? "currency" : "number"}
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
