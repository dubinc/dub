"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  CONDITION_ATTRIBUTES,
  CONDITION_CUSTOMER_ATTRIBUTES,
  CONDITION_SALE_ATTRIBUTES,
} from "@/lib/zod/schemas/rewards";
import { X } from "@/ui/shared/icons";
import {
  ArrowTurnRight2,
  Button,
  Check2,
  ChevronRight,
  MoneyBills2,
  Plus2,
  Popover,
  TooltipContent,
  User,
} from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import { Command } from "cmdk";
import { Fragment, useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import {
  InlineBadgePopover,
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

  const operator = useWatch({ control, name: `modifiers.${index}.operator` });

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
          <OperatorDropdown modifierIndex={index} showNumber={groupCount > 1} />
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
                <RewardIconSquare icon={User} />
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
        <button
          type="button"
          onClick={() => appendCondition({})}
          className="border-border-subtle text-content-emphasis flex h-7 items-center gap-1.5 rounded-lg border bg-white px-2.5 font-medium transition-colors duration-150 hover:bg-neutral-50"
        >
          <Plus2 className="size-3 shrink-0" />
          {operator}
        </button>
        <VerticalLine />
        <div className="border-border-subtle rounded-md border bg-white p-2.5">
          <RewardIconSquare icon={MoneyBills2} />
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

function ConditionLogic({
  modifierIndex,
  conditionIndex,
}: {
  modifierIndex: number;
  conditionIndex: number;
}) {
  const modifierKey = `modifiers.${modifierIndex}` as const;
  const conditionKey = `${modifierKey}.conditions.${conditionIndex}` as const;

  const { control, setValue } = useAddEditRewardForm();
  const [condition, operator] = useWatch({
    control,
    name: [conditionKey, `${modifierKey}.operator`],
  });

  // individual condition logic
  return (
    <span className="text-content-emphasis font-medium">
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
          items={Object.keys(ENTITIES).map((entity) => ({
            text: capitalize(entity) || entity,
            value: entity,
          }))}
        />
      </InlineBadgePopover>{" "}
      {condition.entity && (
        <>
          <InlineBadgePopover
            text={capitalize(condition.attribute) || "Detail"}
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
              items={ENTITIES[condition.entity].attributes.map((attribute) => ({
                text: capitalize(attribute) || attribute,
                value: attribute,
              }))}
            />
          </InlineBadgePopover>{" "}
        </>
      )}
    </span>
  );
}

function OperatorDropdown({
  modifierIndex,
  showNumber,
}: {
  modifierIndex: number;
  showNumber: boolean;
}) {
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
      align="end"
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
        className="text-content-default flex h-5 items-center rounded-lg bg-neutral-200 px-2 text-xs font-medium transition-colors duration-150 hover:bg-neutral-300/80 data-[state=open]:bg-neutral-300/80"
      >
        {showNumber && (
          <div className="border-border-default mr-2 flex h-full items-center border-r pr-2">
            #{modifierIndex + 1}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span>{currentValue}</span>
          <ChevronRight className="text-content-subtle size-2 shrink-0 rotate-90" />
        </div>
      </button>
    </Popover>
  );
}

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);
