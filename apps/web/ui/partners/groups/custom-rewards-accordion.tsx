"use client";

import { useDiscounts } from "@/lib/swr/use-discounts";
import { useRewards } from "@/lib/swr/use-rewards";
import type { DiscountProps, GroupProps, RewardProps } from "@/lib/types";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AnimatedSizeContainer,
  Users,
  useRouterStuff,
} from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { motion } from "motion/react";
import { ReactNode } from "react";

const DEFAULT_REWARD_FIELD = {
  sale: "saleReward",
  lead: "leadReward",
  click: "clickReward",
} as const satisfies Record<string, keyof GroupProps>;

type CustomRewardEvent = keyof typeof DEFAULT_REWARD_FIELD;

type CustomItemsAccordionProps = {
  group: GroupProps;
  event?: RewardProps["event"];
};

export function CustomItemsAccordion({
  group,
  event,
}: CustomItemsAccordionProps) {
  if (!event) {
    return <CustomDiscountsAccordion group={group} />;
  }

  if (event !== "sale" && event !== "lead" && event !== "click") {
    return null;
  }

  return <CustomRewardsAccordion group={group} event={event} />;
}

function CustomRewardsAccordion({
  group,
  event,
}: {
  group: GroupProps;
  event: CustomRewardEvent;
}) {
  const { queryParams } = useRouterStuff();
  const { rewards } = useRewards({ groupId: group.id });
  const defaultReward = group[DEFAULT_REWARD_FIELD[event]];

  const items = (rewards ?? []).filter(
    (reward) => reward.event === event && reward.id !== defaultReward?.id,
  );

  return (
    <ItemsAccordion
      label={`${items.length} custom ${event} ${pluralize("reward", items.length)}`}
      items={items}
      renderItem={(reward) => <ProgramRewardDescription reward={reward} />}
      onSelect={(reward) => {
        queryParams({
          set: { rewardId: reward.id },
          scroll: false,
        });
      }}
    />
  );
}

function CustomDiscountsAccordion({ group }: { group: GroupProps }) {
  const { queryParams } = useRouterStuff();
  const { discounts } = useDiscounts({ groupId: group.id });

  const items = (discounts ?? []).filter(
    (discount) => discount.id !== group.discount?.id,
  );

  return (
    <ItemsAccordion
      label={`${items.length} custom ${pluralize("discount", items.length)}`}
      items={items}
      renderItem={(discount) => (
        <ProgramRewardDescription discount={discount} />
      )}
      onSelect={(discount) => {
        queryParams({
          set: { discountId: discount.id },
          scroll: false,
        });
      }}
    />
  );
}

type AccordionRow = Pick<RewardProps | DiscountProps, "id">;

function ItemsAccordion<T extends AccordionRow>({
  label,
  items,
  renderItem,
  onSelect,
}: {
  label: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
}) {
  return (
    <div className={cn("px-2", items.length > 0 && "relative z-10 -mt-px")}>
      <AnimatedSizeContainer
        height
        className={cn(
          items.length > 0 && "rounded-b-lg border border-neutral-200 bg-white",
        )}
      >
        {items.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Accordion type="single" collapsible className="p-1">
              <AccordionItem value="items" className="border-none py-0">
                <AccordionTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 py-0 pl-1.5 pr-2 text-xs font-medium tracking-tight text-neutral-600 hover:no-underline sm:text-xs [&>svg]:size-2.5 [&>svg]:text-neutral-600"
                >
                  <span className="flex items-center gap-2">
                    <Users className="size-3.5" />
                    {label}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-0 text-xs text-neutral-600 sm:text-xs">
                  <div className="flex flex-col">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelect(item);
                        }}
                        className="w-full rounded-md px-1.5 py-1.5 text-left text-xs text-neutral-600 hover:bg-neutral-50"
                      >
                        {renderItem(item)}
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        ) : null}
      </AnimatedSizeContainer>
    </div>
  );
}
