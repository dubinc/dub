"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import {
  ArrowTurnRight2,
  Button,
  MoneyBills2,
  TooltipContent,
  User,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useFieldArray } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import { RewardIconSquare } from "./reward-icon-square";

export function RewardsLogic({
  isDefaultReward,
}: {
  isDefaultReward: boolean;
}) {
  const { slug: workspaceSlug, plan } = useWorkspace();

  const { control } = useAddEditRewardForm();

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
        <div key={field.id}>
          <div className="flex items-center justify-between py-2 pl-2">
            <div className="flex items-center gap-1.5 text-neutral-800">
              <ArrowTurnRight2 className="size-3 shrink-0" />
              <span className="text-sm font-medium">
                {index === 0 ? "Reward logic" : "Additional logic"}
              </span>
            </div>
            <Button
              variant="outline"
              className="h-6 w-fit px-1"
              icon={<X className="size-4" />}
              onClick={() => removeModifier(index)}
            />
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
      ))}
      <Button
        className="h-8 rounded-lg"
        icon={<ArrowTurnRight2 className="size-4" />}
        text="Add logic"
        onClick={() =>
          appendModifier({
            operator: "AND",
            conditions: [{}],
            amount: 0,
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

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);
