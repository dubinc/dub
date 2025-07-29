"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  CONDITION_ATTRIBUTES,
  CONDITION_CUSTOMER_ATTRIBUTES,
  CONDITION_OPERATORS,
  CONDITION_SALE_ATTRIBUTES,
} from "@/lib/zod/schemas/rewards";
import { X } from "@/ui/shared/icons";
import { EventType } from "@dub/prisma/client";
import {
  ArrowTurnRight2,
  Button,
  Check2,
  ChevronRight,
  InvoiceDollar,
  MoneyBills2,
  Popover,
  TooltipContent,
  User,
} from "@dub/ui";
import { capitalize, cn, COUNTRIES, pluralize, truncate } from "@dub/utils";
import { Command } from "cmdk";
import { Fragment, useContext, useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverInput,
  InlineBadgePopoverInputs,
  InlineBadgePopoverMenu,
} from "./inline-badge-popover";
import { RewardIconSquare } from "./reward-icon-square";

export function RewardsLogic({
  isDefaultReward,
}: {
  isDefaultReward: boolean;
}) {
  const { slug: workspaceSlug, plan } = useWorkspace();

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
        text="Add logic"
        onClick={() =>
          appendModifier({
            operator: "AND",
            conditions: [{}],
            amount: getValues("amount") || 0,
          })
        }
        variant={isDefaultReward ? "primary" : "secondary"}
        disabledTooltip={
          plan?.startsWith("business") ? (
            <TooltipContent
              title="You can only use advanced reward structures on the Advanced plan and above."
              cta="Upgrade to Advanced"
              href={`/${workspaceSlug}/upgrade`}
            />
          ) : undefined
        }
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
            {index === 0 ? "Reward logic" : "Additional logic"}
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
            <div className="border-border-subtle flex items-center justify-between rounded-md border bg-white p-2.5">
              <div className="flex items-center gap-1.5">
                <ConditionLogic
                  modifierIndex={index}
                  conditionIndex={conditionIndex}
                />
              </div>
              <div className="flex items-center gap-1">
                {conditions.length > 1 && (
                  <Button
                    variant="outline"
                    className="h-6 w-fit px-1"
                    icon={<X className="size-4" />}
                    onClick={() => removeCondition(conditionIndex)}
                  />
                )}
              </div>
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
} as const;

const EVENT_ENTITIES: Record<EventType, (keyof typeof ENTITIES)[]> = {
  sale: ["sale", "customer"],
  lead: ["customer"],
  click: [],
};

const ATTRIBUTE_LABELS = {
  productId: "Product ID",
};

const OPERATOR_LABELS = {
  equals_to: "is",
  not_equals: "is not",
  starts_with: "starts with",
  ends_with: "ends with",
  in: "is one of",
  not_in: "is not one of",
} as const;

const formatValue = (
  value: string | number | string[] | number[] | undefined,
) => {
  if (!value) return "Value";

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

  return truncate(value.toString(), 20);
};

function ConditionLogic({
  modifierIndex,
  conditionIndex,
}: {
  modifierIndex: number;
  conditionIndex: number;
}) {
  const modifierKey = `modifiers.${modifierIndex}` as const;
  const conditionKey = `${modifierKey}.conditions.${conditionIndex}` as const;

  const { control, setValue, register } = useAddEditRewardForm();
  const [event, condition, operator] = useWatch({
    control,
    name: ["event", conditionKey, `${modifierKey}.operator`],
  });

  const icon = condition.entity
    ? { customer: User, sale: InvoiceDollar }[condition.entity]
    : ArrowTurnRight2;

  const isArrayValue =
    condition.operator && ["in", "not_in"].includes(condition.operator);

  return (
    <>
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
                { entity: value as keyof typeof ENTITIES },
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
                      attribute: value as (typeof CONDITION_ATTRIBUTES)[number],
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
                  ? OPERATOR_LABELS[condition.operator]
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
                      operator: value as (typeof CONDITION_OPERATORS)[number],
                      // Update value to array / string if needed
                      ...(["in", "not_in"].includes(value)
                        ? !Array.isArray(condition.value)
                          ? { value: [""] }
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
                items={CONDITION_OPERATORS.map((operator) => ({
                  text: OPERATOR_LABELS[operator],
                  value: operator,
                }))}
              />
            </InlineBadgePopover>{" "}
            {condition.operator && (
              <InlineBadgePopover
                text={formatValue(condition.value)}
                invalid={
                  Array.isArray(condition.value)
                    ? condition.value.filter(Boolean).length === 0
                    : !condition.value
                }
              >
                {/* Country selection */}
                {condition.attribute === "country" &&
                !["starts_with", "ends_with"].includes(condition.operator) ? (
                  <InlineBadgePopoverMenu
                    search
                    selectedValue={
                      (condition.value as string[] | undefined) ??
                      (isArrayValue ? [] : undefined)
                    }
                    items={Object.entries(COUNTRIES).map(([key, name]) => ({
                      text: name,
                      value: key,
                      icon: (
                        <img
                          alt={`${key} flag`}
                          src={`https://hatscripts.github.io/circle-flags/flags/${key.toLowerCase()}.svg`}
                          className="size-3 shrink-0"
                        />
                      ),
                    }))}
                    onSelect={(value) => {
                      setValue(conditionKey, {
                        ...condition,
                        value: isArrayValue
                          ? Array.isArray(condition.value)
                            ? (condition.value as string[]).includes(value)
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
                ) : (
                  // String input
                  <InlineBadgePopoverInput
                    {...register(`${conditionKey}.value`, { required: true })}
                  />
                )}
              </InlineBadgePopover>
            )}
          </>
        )}
      </span>
    </>
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

  const { control, register } = useAddEditRewardForm();
  const [amount, type, maxDuration, event] = useWatch({
    control,
    name: [`${modifierKey}.amount`, "type", "maxDuration", "event"],
  });

  return (
    <span className="leading-relaxed">
      Then pay{" "}
      <InlineBadgePopover
        text={
          amount
            ? constructRewardAmount({
                amount: type === "flat" ? amount * 100 : amount,
                type,
              })
            : "amount"
        }
        invalid={!amount}
      >
        <AmountInput modifierKey={modifierKey} />
      </InlineBadgePopover>{" "}
      per {event}
      {event === "sale" && (
        <>
          {" "}
          {maxDuration === 0
            ? "one time"
            : maxDuration === Infinity
              ? "for the customer's lifetime"
              : `for ${maxDuration} ${pluralize("month", Number(maxDuration))}`}
        </>
      )}
    </span>
  );
}

function AmountInput({ modifierKey }: { modifierKey: `modifiers.${number}` }) {
  const { watch, register } = useAddEditRewardForm();
  const type = watch("type");

  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  return (
    <div className="relative rounded-md shadow-sm">
      {type === "flat" && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
      )}
      <input
        className={cn(
          "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm",
          type === "flat" ? "pl-4 pr-12" : "pr-7",
        )}
        {...register(`${modifierKey}.amount`, {
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
      <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
        {type === "flat" ? "USD" : "%"}
      </span>
    </div>
  );
}

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);
