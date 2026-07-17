"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { SUBMITTED_LEADS_ENABLED_PROGRAM_IDS } from "@/lib/submitted-leads/constants";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import {
  CONDITION_OPERATOR_LABELS,
  CONDITION_OPERATORS,
  DATE_CONDITION_OPERATORS,
  ENUM_CONDITION_OPERATORS,
  METADATA_CONDITION_OPERATORS,
  METADATA_NUMBER_CONDITION_OPERATORS,
  METADATA_TEXT_CONDITION_OPERATORS,
  NUMBER_CONDITION_OPERATORS,
  REWARD_CONDITIONS,
  RewardConditionEntityAttribute,
  STRING_CONDITION_OPERATORS,
} from "@/lib/zod/schemas/rewards";
import { CountryFlag } from "@/ui/shared/country-flag";
import { DurationPopoverContent } from "@/ui/shared/duration-popover-content";
import { X } from "@/ui/shared/icons";
import {
  ArrowTurnRight2,
  Button,
  Check2,
  ChevronRight,
  DatePicker,
  InvoiceDollar,
  MoneyBills2,
  Popover,
  User,
  Users,
} from "@dub/ui";
import { UserPlus } from "@dub/ui/icons";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  formatDate,
  pluralize,
  truncate,
} from "@dub/utils";
import { RewardStructure } from "@prisma/client";
import { Command } from "cmdk";
import { Package } from "lucide-react";
import { motion } from "motion/react";
import { Fragment, useContext, useEffect, useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { v4 as uuid } from "uuid";
import {
  InlineBadgePopover,
  InlineBadgePopoverAmountInput,
  InlineBadgePopoverContext,
  InlineBadgePopoverInput,
  InlineBadgePopoverInputs,
  InlineBadgePopoverMenu,
} from "../../shared/inline-badge-popover";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import { RewardIconSquare } from "./reward-icon-square";

export const REWARD_TYPES = [
  {
    text: "Flat",
    value: "flat",
  },
  {
    text: "Percentage",
    value: "percentage",
  },
];

export function RewardsLogic({
  isDefaultReward,
}: {
  isDefaultReward: boolean;
}) {
  const { plan } = useWorkspace();

  const { control, getValues } = useAddEditRewardForm();

  const {
    fields: modifierFields,
    append: appendModifier,
    remove: removeModifier,
  } = useFieldArray({
    control,
    name: "modifiers",
  });

  return (
    <div
      className={cn("flex flex-col gap-2", !!modifierFields.length && "-mt-2")}
    >
      {modifierFields.map((field, index) => (
        <ConditionalGroup
          key={field.id}
          index={index}
          groupCount={modifierFields.length}
          onRemove={() => removeModifier(index)}
        />
      ))}
      <Button
        className="h-8 rounded-lg"
        icon={<ArrowTurnRight2 className="size-4" />}
        text={
          <div className="flex items-center gap-2">
            <span>Add condition</span>
            {!getPlanCapabilities(plan).canUseAdvancedRewardLogic && (
              <div
                className={cn(
                  "rounded-sm px-1.5 py-1 text-[0.625rem] uppercase leading-none",
                  isDefaultReward
                    ? "bg-violet-500/50 text-violet-200"
                    : "bg-violet-50 text-violet-600",
                )}
              >
                Upgrade required
              </div>
            )}
          </div>
        }
        onClick={() => {
          const type = getValues("type");

          appendModifier({
            id: uuid(),
            operator: "AND",
            conditions: [{}],
            amountInCents:
              type === "flat" ? getValues("amountInCents") || 0 : undefined,
            amountInPercentage:
              type === "percentage"
                ? getValues("amountInPercentage") || 0
                : undefined,
            type,
            maxDuration: getValues("maxDuration"),
          });
        }}
        variant={isDefaultReward ? "primary" : "secondary"}
      />
    </div>
  );
}

function ConditionalGroup({
  index,
  groupCount,
  onRemove,
}: {
  index: number;
  groupCount: number;
  onRemove: () => void;
}) {
  const { control } = useAddEditRewardForm();
  const {
    fields: conditions,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({
    control,
    name: `modifiers.${index}.conditions`,
  });

  return (
    <div>
      <div className="flex items-center justify-between py-2 pl-2">
        <div className="flex items-center gap-1.5 text-neutral-800">
          <ArrowTurnRight2 className="size-3 shrink-0" />
          <span className="text-sm font-medium">
            {index === 0 ? "Reward condition" : "Additional condition"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {groupCount > 1 && (
            <div className="text-content-default flex h-5 items-center rounded-md bg-neutral-200 px-2 text-xs font-medium">
              #{index + 1}
            </div>
          )}
          <Button
            variant="outline"
            className="h-6 w-fit px-1"
            icon={<X className="size-4" />}
            onClick={onRemove}
          />
        </div>
      </div>

      <div className="border-border-subtle rounded-lg border bg-white p-2.5">
        {conditions.map((condition, conditionIndex) => (
          <Fragment key={condition.id}>
            <div className="border-border-subtle rounded-md border bg-white">
              <ConditionLogic
                modifierIndex={index}
                conditionIndex={conditionIndex}
                onRemove={
                  conditions.length > 1
                    ? () => removeCondition(conditionIndex)
                    : undefined
                }
              />
            </div>
            <VerticalLine />
          </Fragment>
        ))}
        <div className="flex items-center justify-between gap-2">
          <OperatorDropdown modifierIndex={index} />
          <Button
            variant="secondary"
            className="h-7 w-fit px-3 font-medium"
            text="Add criteria"
            onClick={() => appendCondition({})}
          />
        </div>
        <VerticalLine />
        <div className="border-border-subtle flex items-center gap-2.5 rounded-md border bg-white p-2.5">
          <RewardIconSquare icon={MoneyBills2} />
          <ResultTerms modifierIndex={index} />
        </div>
      </div>
    </div>
  );
}

const formatValue = (
  value: string | number | string[] | number[] | undefined,
  attribute?: Pick<RewardConditionEntityAttribute, "type" | "options">,
  metadataOperator?: (typeof CONDITION_OPERATORS)[number],
) => {
  if (
    metadataOperator &&
    METADATA_NUMBER_CONDITION_OPERATORS.includes(metadataOperator)
  ) {
    if (value === "" || value === undefined || isNaN(Number(value)))
      return "Value";
    return String(value);
  }

  const type = attribute?.type ?? "string";

  if (
    ["number", "currency"].includes(type)
      ? value === "" || isNaN(Number(value))
      : !value
  )
    return "Value";

  if (Array.isArray(value)) {
    if (!value.filter(Boolean).length) return "Value";

    const filtered = value.filter(Boolean);

    return (
      filtered
        .map((v) =>
          truncate(
            attribute?.options
              ? attribute.options.find((o) => o.id === v)?.label ?? v.toString()
              : v.toString(),
            16,
          ),
        )
        .slice(0, 2)
        .join(", ") + (filtered.length > 2 ? ` +${filtered.length - 2}` : "")
    );
  }

  // Return matching option label
  if (attribute?.options) {
    const option = attribute.options.find((o) => o.id === value);
    if (option) return option.label;
  }

  // For date values, format timestamp as readable date + time
  if (type === "date") {
    if (!value || isNaN(Number(value))) {
      return "Value";
    }

    return formatDate(new Date(Number(value)));
  }

  // For numeric values, show the number as is
  if (["number", "currency"].includes(type)) {
    return type === "number"
      ? value!.toString()
      : // value is represented in dollars, so need to convert to cents (because currencyFormatter expects cents)
        currencyFormatter(Number(value) * 100, {
          trailingZeroDisplay: "stripIfInteger",
        });
  }

  return truncate(value!.toString(), 20);
};

function MetadataConditionOperatorMenu({
  selectedValue,
  onSelect,
}: {
  selectedValue?: (typeof CONDITION_OPERATORS)[number];
  onSelect: (value: (typeof CONDITION_OPERATORS)[number]) => void;
}) {
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const renderItem = (op: (typeof CONDITION_OPERATORS)[number]) => (
    <Command.Item
      key={op}
      value={`${CONDITION_OPERATOR_LABELS[op]} ${op}`}
      onSelect={() => {
        onSelect(op);
        setIsOpen(false);
      }}
      className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 transition-colors duration-150 data-[selected=true]:bg-neutral-100"
    >
      <span className="text-content-default pr-3 text-left text-sm font-medium">
        {CONDITION_OPERATOR_LABELS[op]}
      </span>
      {selectedValue === op && (
        <Check2 className="text-content-emphasis size-3.5 shrink-0" />
      )}
    </Command.Item>
  );

  return (
    <div className="-mx-1 box-border w-[calc(100%+0.5rem)] min-w-0 max-w-none">
      <Command loop className="w-full focus:outline-none">
        <Command.List className="scrollbar-hide flex max-h-64 w-full max-w-52 flex-col gap-1 overflow-y-auto transition-all">
          <div className="text-content-subtle mx-2 py-2 text-xs font-medium">
            Text fields
          </div>
          <div className="mx-1 flex flex-col gap-1">
            {METADATA_TEXT_CONDITION_OPERATORS.map(renderItem)}
          </div>
          <div
            className="bg-border-subtle mt-1 h-px w-full min-w-0 shrink-0"
            role="separator"
          />
          <div className="text-content-subtle mx-2 py-2 text-xs font-medium">
            Number fields
          </div>
          <div className="mx-1 flex flex-col gap-1">
            {METADATA_NUMBER_CONDITION_OPERATORS.map(renderItem)}
          </div>
        </Command.List>
      </Command>
    </div>
  );
}

function ConditionLogic({
  modifierIndex,
  conditionIndex,
  onRemove,
}: {
  modifierIndex: number;
  conditionIndex: number;
  onRemove?: () => void;
}) {
  const { program } = useProgram();
  const modifierKey = `modifiers.${modifierIndex}` as const;
  const conditionKey = `${modifierKey}.conditions.${conditionIndex}` as const;

  const { control, setValue, register } = useAddEditRewardForm();
  const [event, condition, operator] = useWatch({
    control,
    name: ["event", conditionKey, `${modifierKey}.operator`],
  });

  const entities = REWARD_CONDITIONS[event].entities;
  const entity = condition.entity
    ? entities.find((e) => e.id === condition.entity)
    : undefined;

  const attribute =
    entity && condition.attribute
      ? entity.attributes.find((a) => a.id === condition.attribute)
      : undefined;

  const attributeType = attribute?.type ?? "string";

  const isMetadataCondition =
    (condition.entity === "lead" || condition.entity === "sale") &&
    condition.attribute === "metadata";

  const isMetadataNumeric =
    isMetadataCondition &&
    !!condition.operator &&
    METADATA_NUMBER_CONDITION_OPERATORS.includes(condition.operator);

  const icon = entity
    ? {
        customer: User,
        sale: InvoiceDollar,
        partner: Users,
        lead: UserPlus,
      }[entity.id] ?? User
    : ArrowTurnRight2;

  const isArrayValue =
    condition.operator === "in" || condition.operator === "not_in";

  const isContainsOperator =
    condition.operator === "contains" || condition.operator === "not_contains";

  const [displayProductLabel, setDisplayProductLabel] = useState(false);

  // Auto-set operator to "equals_to" for customer.source
  const isCustomerSourceCondition =
    condition.entity === "customer" && condition.attribute === "source";
  const isSaleTypeCondition =
    condition.entity === "sale" && condition.attribute === "type";

  const availableConditionOperators: (typeof CONDITION_OPERATORS)[number][] =
    attributeType === "metadata"
      ? METADATA_CONDITION_OPERATORS
      : ["number", "currency"].includes(attributeType)
        ? NUMBER_CONDITION_OPERATORS
        : attributeType === "enum"
          ? ENUM_CONDITION_OPERATORS
          : attributeType === "date"
            ? DATE_CONDITION_OPERATORS
            : STRING_CONDITION_OPERATORS;

  useEffect(() => {
    if (
      isMetadataCondition &&
      condition.operator &&
      !METADATA_CONDITION_OPERATORS.includes(condition.operator)
    ) {
      setValue(
        conditionKey,
        {
          ...condition,
          operator: undefined,
          value: undefined,
        },
        {
          shouldDirty: true,
        },
      );
    }
  }, [
    isMetadataCondition,
    condition.operator,
    condition,
    conditionKey,
    setValue,
  ]);

  useEffect(() => {
    if (
      (isCustomerSourceCondition || isSaleTypeCondition) &&
      condition.operator !== "equals_to"
    ) {
      setValue(
        conditionKey,
        {
          ...condition,
          operator: "equals_to",
        },
        {
          shouldDirty: true,
        },
      );
    }
  }, [
    isCustomerSourceCondition,
    isSaleTypeCondition,
    condition.operator,
    condition,
    conditionKey,
    setValue,
  ]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between p-2.5">
        <div className="flex items-center gap-1.5">
          <RewardIconSquare icon={icon} />
          <span className="text-content-emphasis font-medium leading-relaxed">
            {conditionIndex === 0 ? "If" : capitalize(operator.toLowerCase())}{" "}
            <InlineBadgePopover
              text={capitalize(condition.entity) || "Select item"}
              invalid={!condition.entity}
            >
              <InlineBadgePopoverMenu
                selectedValue={condition.entity}
                onSelect={(value) =>
                  setValue(
                    conditionKey,
                    {
                      entity: value,
                      // Clear dependent fields when entity changes
                      attribute: undefined,
                      operator: undefined,
                      value: undefined,
                      metadataField: undefined,
                    },
                    {
                      shouldDirty: true,
                    },
                  )
                }
                items={entities.map((entity) => ({
                  text: entity.label,
                  value: entity.id,
                }))}
              />
            </InlineBadgePopover>{" "}
            {entity && (
              <>
                <InlineBadgePopover
                  text={
                    condition.attribute
                      ? entity.attributes.find(
                          (a) => a.id === condition.attribute,
                        )?.label || capitalize(condition.attribute)
                      : "Detail"
                  }
                  invalid={!condition.attribute}
                >
                  <InlineBadgePopoverMenu
                    selectedValue={condition.attribute}
                    onSelect={(value) =>
                      setValue(
                        conditionKey,
                        {
                          entity: condition.entity,
                          attribute: value,
                          ...(value !== "metadata"
                            ? { metadataField: undefined }
                            : {}),
                        },
                        {
                          shouldDirty: true,
                        },
                      )
                    }
                    items={entity.attributes
                      .filter(
                        (attribute) =>
                          attribute.id !== "source" ||
                          (program &&
                            SUBMITTED_LEADS_ENABLED_PROGRAM_IDS.includes(
                              program.id,
                            )),
                      )
                      .map((attribute) => ({
                        text: attribute.label,
                        value: attribute.id,
                      }))}
                  />
                </InlineBadgePopover>{" "}
                {isMetadataCondition && (
                  <>
                    <InlineBadgePopover
                      text={
                        condition.metadataField?.trim()
                          ? truncate(condition.metadataField.trim(), 24)
                          : "Field name"
                      }
                      invalid={!condition.metadataField?.trim()}
                    >
                      <InlineBadgePopoverInput
                        placeholder="Field name"
                        {...register(`${conditionKey}.metadataField`)}
                      />
                    </InlineBadgePopover>{" "}
                  </>
                )}
                {isCustomerSourceCondition || isSaleTypeCondition ? (
                  <span className="text-content-emphasis font-medium">is </span>
                ) : (
                  <InlineBadgePopover
                    text={
                      condition.operator
                        ? CONDITION_OPERATOR_LABELS[condition.operator]
                        : "Condition"
                    }
                    invalid={!condition.operator}
                  >
                    {isMetadataCondition ? (
                      <MetadataConditionOperatorMenu
                        selectedValue={condition.operator}
                        onSelect={(value) => {
                          const metadataNumeric =
                            METADATA_NUMBER_CONDITION_OPERATORS.includes(value);
                          setValue(
                            conditionKey,
                            {
                              ...condition,
                              operator: value,
                              ...(["in", "not_in"].includes(value)
                                ? { value: [] }
                                : ["contains", "not_contains"].includes(value)
                                  ? { value: "" }
                                  : metadataNumeric
                                    ? typeof condition.value !== "number"
                                      ? { value: "" }
                                      : null
                                    : typeof condition.value !== "string" &&
                                        !Array.isArray(condition.value)
                                      ? { value: "" }
                                      : null),
                            },
                            {
                              shouldDirty: true,
                            },
                          );
                        }}
                      />
                    ) : (
                      <InlineBadgePopoverMenu
                        selectedValue={condition.operator}
                        onSelect={(value) =>
                          setValue(
                            conditionKey,
                            {
                              ...condition,
                              operator:
                                value as (typeof CONDITION_OPERATORS)[number],
                              // Reset value shape when operator changes
                              ...(["in", "not_in"].includes(value)
                                ? { value: [] }
                                : ["number", "currency"].includes(attributeType)
                                  ? typeof condition.value !== "number"
                                    ? { value: "" }
                                    : null
                                  : attributeType === "date"
                                    ? typeof condition.value !== "number"
                                      ? { value: undefined }
                                      : null
                                    : typeof condition.value !== "string"
                                      ? { value: "" }
                                      : null),
                            },
                            {
                              shouldDirty: true,
                            },
                          )
                        }
                        items={availableConditionOperators.map((operator) => ({
                          text: CONDITION_OPERATOR_LABELS[operator],
                          value: operator,
                        }))}
                      />
                    )}
                  </InlineBadgePopover>
                )}{" "}
                {condition.operator && (
                  <>
                    {attributeType === "date" && !isMetadataCondition ? (
                      <DatePicker
                        value={
                          condition.value
                            ? new Date(condition.value as number)
                            : undefined
                        }
                        onChange={(date) =>
                          setValue(conditionKey, {
                            ...condition,
                            value: date ? date.getTime() : undefined,
                          })
                        }
                        placeholder={condition.label || "Select date"}
                        invalid={!condition.value}
                        trigger={({ displayValue, placeholder, invalid }) => (
                          <button
                            type="button"
                            className={cn(
                              "inline-block rounded px-1.5 text-left text-sm font-semibold transition-colors",
                              invalid
                                ? "bg-orange-50 text-orange-500 hover:bg-orange-100 data-[state=open]:bg-orange-100"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100 data-[state=open]:bg-blue-100",
                            )}
                          >
                            {displayValue ?? placeholder}
                          </button>
                        )}
                        showYearNavigation
                      />
                    ) : (
                      <InlineBadgePopover
                        text={formatValue(
                          condition.value,
                          attribute,
                          isMetadataCondition ? condition.operator : undefined,
                        )}
                        invalid={
                          isContainsOperator
                            ? String(condition.value ?? "").trim() === ""
                            : Array.isArray(condition.value)
                              ? condition.value.filter(Boolean).length === 0
                              : isMetadataNumeric
                                ? condition.value === "" ||
                                  isNaN(Number(condition.value))
                                : ["number", "currency"].includes(attributeType)
                                  ? condition.value === "" ||
                                    isNaN(Number(condition.value))
                                  : !condition.value
                        }
                        buttonClassName={cn(
                          condition.attribute === "productId" &&
                            "rounded-r-none",
                        )}
                      >
                        {/* Country selection (single value only) */}
                        {condition.attribute === "country" && !isArrayValue ? (
                          // Country selector
                          <InlineBadgePopoverMenu
                            search
                            selectedValue={
                              condition.value as string | undefined
                            }
                            items={Object.entries(COUNTRIES).map(
                              ([key, name]) => ({
                                text: name,
                                value: key,
                                icon: (
                                  <CountryFlag
                                    countryCode={key}
                                    className="size-3"
                                  />
                                ),
                              }),
                            )}
                            onSelect={(value) => {
                              setValue(conditionKey, {
                                ...condition,
                                value,
                              });
                            }}
                          />
                        ) : attribute?.options && !isArrayValue ? (
                          // Select option selector
                          <InlineBadgePopoverMenu
                            search={attribute.options.length > 4}
                            selectedValue={
                              condition.value as string | undefined
                            }
                            items={attribute.options.map(({ id, label }) => ({
                              text: label,
                              value: id,
                            }))}
                            onSelect={(value) => {
                              setValue(conditionKey, {
                                ...condition,
                                value,
                              });
                            }}
                          />
                        ) : isContainsOperator ? (
                          <InlineBadgePopoverInput
                            placeholder="Substring to match"
                            {...register(`${conditionKey}.value`, {
                              required: true,
                            })}
                          />
                        ) : isArrayValue ? (
                          // Multi-value list input for is one of / is not one of
                          <InlineBadgePopoverInputs
                            values={
                              Array.isArray(condition.value)
                                ? (condition.value as string[])
                                : []
                            }
                            onChange={(values) => {
                              setValue(conditionKey, {
                                ...condition,
                                value: values,
                              });
                            }}
                          />
                        ) : ["number", "currency"].includes(attributeType) ||
                          isMetadataNumeric ? (
                          // Number/currency input
                          <AmountInput
                            fieldKey={`${conditionKey}.value`}
                            type={
                              attributeType === "currency"
                                ? "currency"
                                : "number"
                            }
                          />
                        ) : (
                          // String input
                          <InlineBadgePopoverInput
                            {...register(`${conditionKey}.value`, {
                              required: true,
                            })}
                          />
                        )}
                      </InlineBadgePopover>
                    )}

                    {condition.attribute === "subscriptionDurationMonths" && (
                      <span> months</span>
                    )}

                    {condition.attribute === "productId" && condition.value && (
                      <button
                        type="button"
                        className="ml-0.5 inline-flex h-5 items-center justify-center rounded rounded-l-none bg-blue-50 px-1.5 hover:bg-blue-100"
                        onClick={() =>
                          setDisplayProductLabel(!displayProductLabel)
                        }
                      >
                        <ChevronRight
                          className={cn(
                            "size-2.5 shrink-0 text-blue-500 transition-transform duration-200 [&_*]:stroke-2",
                            displayProductLabel ? "rotate-90" : "",
                          )}
                        />
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </span>
        </div>
        {onRemove && (
          <Button
            variant="outline"
            className="h-6 w-fit px-1"
            icon={<X className="size-4" />}
            onClick={onRemove}
          />
        )}
      </div>

      {/* Product name input - only show for sale productId conditions with a value */}
      {condition.entity === "sale" &&
        condition.attribute === "productId" &&
        condition.value && (
          <motion.div
            transition={{ ease: "easeInOut", duration: 0.2 }}
            initial={false}
            animate={{
              height: displayProductLabel ? "auto" : 0,
              opacity: displayProductLabel ? 1 : 0,
            }}
            className="overflow-hidden"
          >
            <div className="border-border-subtle flex items-center gap-1.5 border-t p-2.5">
              <RewardIconSquare icon={Package} />
              <span className="text-content-emphasis font-medium leading-relaxed">
                Shown as{" "}
                <InlineBadgePopover
                  text={condition.label || "Product name"}
                  invalid={!condition.label}
                >
                  {displayProductLabel && (
                    <InlineBadgePopoverInput
                      {...register(`${conditionKey}.label`)}
                    />
                  )}
                </InlineBadgePopover>
              </span>
            </div>
          </motion.div>
        )}
    </div>
  );
}

function OperatorDropdown({ modifierIndex }: { modifierIndex: number }) {
  const { control, setValue } = useAddEditRewardForm();
  const currentValue = useWatch({
    control,
    name: `modifiers.${modifierIndex}.operator`,
  });

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      align="start"
      content={
        <div className="min-w-24 p-0.5">
          <Command loop className="focus:outline-none">
            <Command.List>
              {(["AND", "OR"] as const).map((value) => (
                <Command.Item
                  key={value}
                  onSelect={() => {
                    setValue(`modifiers.${modifierIndex}.operator`, value, {
                      shouldDirty: true,
                    });
                    setIsOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-neutral-100"
                >
                  <span className="text-content-default pr-3 text-left text-sm font-medium">
                    {value}
                  </span>
                  {currentValue === value && (
                    <Check2 className="text-content-emphasis size-3.5 shrink-0" />
                  )}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      }
    >
      <button
        type="button"
        className="border-border-subtle text-content-emphasis group flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 font-medium transition-colors duration-150 hover:bg-neutral-50"
      >
        <div className="flex items-center gap-1.5">
          <span>{currentValue}</span>
          <ChevronRight className="text-content-subtle size-2.5 shrink-0 rotate-90 [&_*]:stroke-2" />
        </div>
      </button>
    </Popover>
  );
}

function ResultTerms({ modifierIndex }: { modifierIndex: number }) {
  const modifierKey = `modifiers.${modifierIndex}` as const;

  const { control, setValue } = useAddEditRewardForm();
  const [
    amountInCents,
    amountInPercentage,
    type,
    maxDuration,
    event,
    parentType,
    parentMaxDuration,
  ] = useWatch({
    control,
    name: [
      `${modifierKey}.amountInCents`,
      `${modifierKey}.amountInPercentage`,
      `${modifierKey}.type`,
      `${modifierKey}.maxDuration`,
      "event",
      "type",
      "maxDuration",
    ],
  });

  // Use parent values as fallbacks if modifier doesn't have type or maxDuration
  const displayType = type || parentType;
  const displayMaxDuration =
    maxDuration !== undefined ? maxDuration : parentMaxDuration;

  const amount = displayType === "flat" ? amountInCents : amountInPercentage;

  return (
    <span className="leading-relaxed">
      Then pay{" "}
      {event === "sale" && (
        <>
          a{" "}
          <InlineBadgePopover text={capitalize(displayType)}>
            <InlineBadgePopoverMenu
              selectedValue={type}
              onSelect={(value) =>
                setValue(`${modifierKey}.type`, value as RewardStructure, {
                  shouldDirty: true,
                })
              }
              items={REWARD_TYPES}
            />
          </InlineBadgePopover>{" "}
          {displayType === "percentage" && "of "}
        </>
      )}
      <InlineBadgePopover
        text={
          amount != null && !isNaN(amount)
            ? constructRewardAmount({
                type: displayType,
                amountInCents:
                  displayType === "flat" ? amount * 100 : undefined,
                amountInPercentage:
                  displayType === "percentage" ? amount : undefined,
                maxDuration: displayMaxDuration,
              })
            : "amount"
        }
        invalid={amount == null || isNaN(amount)}
      >
        <ResultAmountInput modifierKey={modifierKey} />
      </InlineBadgePopover>{" "}
      per {event}
      {event === "sale" && (
        <>
          {" "}
          <InlineBadgePopover
            text={
              displayMaxDuration === 0
                ? "one time"
                : displayMaxDuration === Infinity
                  ? "for the customer's lifetime"
                  : `for ${displayMaxDuration} ${pluralize("month", Number(displayMaxDuration))}`
            }
          >
            <DurationPopoverContent
              value={displayMaxDuration ?? undefined}
              onChange={(value) =>
                setValue(`${modifierKey}.maxDuration`, value, {
                  shouldDirty: true,
                })
              }
              presetDurations={RECURRING_MAX_DURATIONS.filter(
                (v) => v !== 0 && v !== 1, // filter out one-time and 1-month intervals (we only use 1-month for discounts)
              )}
            />
          </InlineBadgePopover>
        </>
      )}
    </span>
  );
}

function ResultAmountInput({
  modifierKey,
}: {
  modifierKey: `modifiers.${number}`;
}) {
  const { watch, setValue } = useAddEditRewardForm();

  const type = watch(`${modifierKey}.type`);
  const parentType = watch("type");

  const displayType = type || parentType;

  // Set the modifier type to parent type if it's undefined (backward compatibility)
  useEffect(() => {
    if (type === undefined && parentType) {
      setValue(`${modifierKey}.type`, parentType, { shouldDirty: true });
    }
  }, [type, parentType, setValue, modifierKey]);

  const fieldKey =
    displayType === "flat"
      ? (`${modifierKey}.amountInCents` as const)
      : (`${modifierKey}.amountInPercentage` as const);

  return (
    <AmountInput
      fieldKey={fieldKey}
      type={displayType === "flat" ? "currency" : "percentage"}
    />
  );
}

function AmountInput({
  fieldKey,
  type,
}: {
  fieldKey:
    | `modifiers.${number}.amountInCents`
    | `modifiers.${number}.amountInPercentage`
    | `modifiers.${number}.conditions.${number}.value`;
  type: "currency" | "percentage" | "number";
}) {
  const { register } = useAddEditRewardForm();

  return (
    <InlineBadgePopoverAmountInput
      type={type}
      {...register(fieldKey, {
        required: true,
        setValueAs: (value: string) => (value === "" ? undefined : +value),
        min: 0,
        max: type === "percentage" ? 100 : undefined,
      })}
    />
  );
}

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);
