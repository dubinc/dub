"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import {
  ATTRIBUTE_LABELS,
  CONDITION_ATTRIBUTES,
  CONDITION_CUSTOMER_ATTRIBUTES,
  CONDITION_OPERATOR_LABELS,
  CONDITION_OPERATORS,
  CONDITION_PARTNER_ATTRIBUTES,
  CONDITION_SALE_ATTRIBUTES,
  ENTITY_ATTRIBUTE_TYPES,
  NUMBER_CONDITION_OPERATORS,
  STRING_CONDITION_OPERATORS,
} from "@/lib/zod/schemas/rewards";
import { X } from "@/ui/shared/icons";
import { EventType, RewardStructure } from "@dub/prisma/client";
import {
  ArrowTurnRight2,
  Button,
  Check2,
  ChevronRight,
  InvoiceDollar,
  MoneyBills2,
  Popover,
  User,
  Users,
} from "@dub/ui";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  pluralize,
  truncate,
} from "@dub/utils";
import { Command } from "cmdk";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { Fragment, useContext, useEffect, useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import {
  InlineBadgePopover,
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
        onClick={() =>
          appendModifier({
            operator: "AND",
            conditions: [{}],
            amount: getValues("amount") || 0,
            type: getValues("type"),
            maxDuration: getValues("maxDuration"),
          })
        }
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

const ENTITIES = {
  customer: {
    attributes: CONDITION_CUSTOMER_ATTRIBUTES,
  },
  sale: {
    attributes: CONDITION_SALE_ATTRIBUTES,
  },
  partner: {
    attributes: CONDITION_PARTNER_ATTRIBUTES,
  },
} as const;

const EVENT_ENTITIES: Record<EventType, (keyof typeof ENTITIES)[]> = {
  sale: ["sale", "customer", "partner"],
  lead: ["customer", "partner"],
  click: [],
};

const formatValue = (
  value: string | number | string[] | number[] | undefined,
  type: "number" | "currency" | "string" = "string",
) => {
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
        .map((v) => truncate(v.toString(), 16))
        .slice(0, 2)
        .join(", ") + (filtered.length > 2 ? ` +${filtered.length - 2}` : "")
    );
  }

  // For numeric values, show the number as is
  if (["number", "currency"].includes(type)) {
    return type === "number"
      ? value!.toString()
      : currencyFormatter(
          Number(value),
          Number(value) % 1 !== 0 ? { minimumFractionDigits: 2 } : undefined,
        );
  }

  return truncate(value!.toString(), 20);
};

function ConditionLogic({
  modifierIndex,
  conditionIndex,
  onRemove,
}: {
  modifierIndex: number;
  conditionIndex: number;
  onRemove?: () => void;
}) {
  const modifierKey = `modifiers.${modifierIndex}` as const;
  const conditionKey = `${modifierKey}.conditions.${conditionIndex}` as const;

  const { control, setValue, register } = useAddEditRewardForm();
  const [event, condition, operator] = useWatch({
    control,
    name: ["event", conditionKey, `${modifierKey}.operator`],
  });

  const attributeType =
    condition.entity && condition.attribute
      ? ENTITY_ATTRIBUTE_TYPES[condition.entity]?.[condition.attribute] ??
        "string"
      : "string";

  const icon = condition.entity
    ? { customer: User, sale: InvoiceDollar, partner: Users }[condition.entity]
    : ArrowTurnRight2;

  const isArrayValue =
    condition.operator && ["in", "not_in"].includes(condition.operator);

  const [displayProductLabel, setDisplayProductLabel] = useState(false);

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
                      entity: value as keyof typeof ENTITIES,
                      // Clear dependent fields when entity changes
                      attribute: undefined,
                      operator: undefined,
                      value: undefined,
                    },
                    {
                      shouldDirty: true,
                    },
                  )
                }
                items={Object.keys(ENTITIES)
                  .filter((e) =>
                    EVENT_ENTITIES[event]?.includes(e as keyof typeof ENTITIES),
                  )
                  .map((entity) => ({
                    text: capitalize(entity) || entity,
                    value: entity,
                  }))}
              />
            </InlineBadgePopover>{" "}
            {condition.entity && (
              <>
                <InlineBadgePopover
                  text={
                    condition.attribute
                      ? ATTRIBUTE_LABELS?.[condition.attribute] ||
                        capitalize(condition.attribute)
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
                          attribute:
                            value as (typeof CONDITION_ATTRIBUTES)[number],
                        },
                        {
                          shouldDirty: true,
                        },
                      )
                    }
                    items={ENTITIES[condition.entity].attributes.map(
                      (attribute) => ({
                        text:
                          ATTRIBUTE_LABELS?.[attribute] ||
                          capitalize(attribute) ||
                          attribute,
                        value: attribute,
                      }),
                    )}
                  />
                </InlineBadgePopover>{" "}
                <InlineBadgePopover
                  text={
                    condition.operator
                      ? CONDITION_OPERATOR_LABELS[condition.operator]
                      : "Condition"
                  }
                  invalid={!condition.operator}
                >
                  <InlineBadgePopoverMenu
                    selectedValue={condition.operator}
                    onSelect={(value) =>
                      setValue(
                        conditionKey,
                        {
                          ...condition,
                          operator:
                            value as (typeof CONDITION_OPERATORS)[number],
                          // Update value to array / string / number if needed
                          ...(["in", "not_in"].includes(value)
                            ? !Array.isArray(condition.value)
                              ? { value: [] }
                              : null
                            : ["number", "currency"].includes(attributeType)
                              ? typeof condition.value !== "number"
                                ? { value: "" }
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
                    items={(["number", "currency"].includes(attributeType)
                      ? NUMBER_CONDITION_OPERATORS
                      : STRING_CONDITION_OPERATORS
                    ).map((operator) => ({
                      text: CONDITION_OPERATOR_LABELS[operator],
                      value: operator,
                    }))}
                  />
                </InlineBadgePopover>{" "}
                {condition.operator && (
                  <>
                    <InlineBadgePopover
                      text={formatValue(condition.value, attributeType)}
                      invalid={
                        Array.isArray(condition.value)
                          ? condition.value.filter(Boolean).length === 0
                          : ["number", "currency"].includes(attributeType)
                            ? condition.value === "" ||
                              isNaN(Number(condition.value))
                            : !condition.value
                      }
                      buttonClassName={cn(
                        condition.attribute === "productId" && "rounded-r-none",
                      )}
                    >
                      {/* Country selection */}
                      {condition.attribute === "country" &&
                      !["starts_with", "ends_with"].includes(
                        condition.operator,
                      ) ? (
                        <InlineBadgePopoverMenu
                          search
                          selectedValue={
                            (condition.value as string[] | undefined) ??
                            (isArrayValue ? [] : undefined)
                          }
                          items={Object.entries(COUNTRIES).map(
                            ([key, name]) => ({
                              text: name,
                              value: key,
                              icon: (
                                <img
                                  alt={`${key} flag`}
                                  src={`https://hatscripts.github.io/circle-flags/flags/${key.toLowerCase()}.svg`}
                                  className="size-3 shrink-0"
                                />
                              ),
                            }),
                          )}
                          onSelect={(value) => {
                            setValue(conditionKey, {
                              ...condition,
                              value: isArrayValue
                                ? Array.isArray(condition.value)
                                  ? (condition.value as string[]).includes(
                                      value,
                                    )
                                    ? (condition.value.filter(
                                        (v) => v !== value,
                                      ) as string[])
                                    : ([...condition.value, value] as string[])
                                  : [value]
                                : value,
                            });
                          }}
                        />
                      ) : isArrayValue ? (
                        // String array input
                        <InlineBadgePopoverInputs
                          values={
                            condition.value
                              ? Array.isArray(condition.value)
                                ? condition.value.map(String)
                                : [condition.value.toString()]
                              : [""]
                          }
                          onChange={(values) => {
                            setValue(conditionKey, {
                              ...condition,
                              value: values,
                            });
                          }}
                        />
                      ) : ["number", "currency"].includes(attributeType) ? (
                        <AmountInput
                          fieldKey={`${conditionKey}.value`}
                          type={attributeType as "number" | "currency"}
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
  const [amount, type, maxDuration, event, parentType, parentMaxDuration] =
    useWatch({
      control,
      name: [
        `${modifierKey}.amount`,
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
          !isNaN(amount)
            ? constructRewardAmount({
                amount: displayType === "flat" ? amount * 100 : amount,
                type: displayType,
                maxDuration: displayMaxDuration,
              })
            : "amount"
        }
        invalid={isNaN(amount)}
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
            <InlineBadgePopoverMenu
              selectedValue={
                displayMaxDuration === Infinity
                  ? "Infinity"
                  : displayMaxDuration?.toString()
              }
              onSelect={(value) =>
                setValue(
                  `${modifierKey}.maxDuration`,
                  value === "Infinity" ? Infinity : Number(value),
                  {
                    shouldDirty: true,
                  },
                )
              }
              items={[
                {
                  text: "one time",
                  value: "0",
                },
                ...RECURRING_MAX_DURATIONS.filter(
                  (v) => v !== 0 && v !== 1, // filter out one-time and 1-month intervals (we only use 1-month for discounts)
                ).map((v) => ({
                  text: `for ${v} ${pluralize("month", Number(v))}`,
                  value: v.toString(),
                })),
                {
                  text: "for the customer's lifetime",
                  value: "Infinity",
                },
              ]}
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

  return (
    <AmountInput
      fieldKey={`${modifierKey}.amount`}
      type={displayType === "flat" ? "currency" : "percentage"}
    />
  );
}

function AmountInput({
  fieldKey,
  type,
}: {
  fieldKey:
    | `modifiers.${number}.amount`
    | `modifiers.${number}.conditions.${number}.value`;
  type: "currency" | "percentage" | "number";
}) {
  const { register } = useAddEditRewardForm();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  return (
    <div className="relative rounded-md shadow-sm">
      {type === "currency" && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
      )}
      <input
        className={cn(
          "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm",
          type === "currency" && "pl-4 pr-12",
          type === "percentage" && "pr-7",
        )}
        {...register(fieldKey, {
          required: true,
          setValueAs: (value: string) => (value === "" ? undefined : +value),
          min: 0,
          max: type === "percentage" ? 100 : undefined,
          onChange: handleMoneyInputChange,
        })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
          }

          handleMoneyKeyDown(e);
        }}
      />
      {["currency", "percentage"].includes(type) && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
          {type === "currency" ? "USD" : "%"}
        </span>
      )}
    </div>
  );
}

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);
