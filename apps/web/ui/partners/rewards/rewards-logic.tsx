"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import {
  ArrowTurnRight2,
  Button,
  Check2,
  ChevronRight,
  MoneyBills2,
  Popover,
  TooltipContent,
  User,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
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
        <div className="border-border-subtle rounded-md border bg-white p-2.5">
          <RewardIconSquare icon={User} />
        </div>
        <VerticalLine />
        <div className="border-border-subtle rounded-md border bg-white p-2.5">
          <RewardIconSquare icon={MoneyBills2} />
        </div>
      </div>
    </div>
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
