"use client";

import useGroup from "@/lib/swr/use-group";
import type { DiscountProps, GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { useDiscountSheet } from "@/ui/partners/discounts/add-edit-discount-sheet";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { Button } from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { BadgePercent } from "lucide-react";

export const GroupDiscounts = () => {
  const { group, loading } = useGroup();

  return (
    <div>
      {loading || !group ? (
        <DiscountSkeleton />
      ) : (
        <DiscountItem discount={group?.discount} group={group} />
      )}
    </div>
  );
};

const DiscountItem = ({
  discount,
  group,
}: {
  discount?: DiscountProps | null;
  group: GroupProps;
}) => {
  const { DiscountSheet, setIsOpen } = useDiscountSheet({
    ...(discount && { discount }),
  });

  return (
    <>
      {DiscountSheet}
      <div
        className={cn(
          "flex cursor-pointer flex-col gap-4 rounded-lg p-6 transition-all md:flex-row md:items-center",
          discount && "border border-neutral-200 hover:border-neutral-300",
          !discount && "bg-neutral-50 hover:bg-neutral-100",
        )}
        onClick={(e) => {
          if (isClickOnInteractiveChild(e)) return;
          setIsOpen(true);
        }}
      >
        <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <BadgePercent className="size-4 text-neutral-600" />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-y-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal">
              {discount ? (
                <ProgramRewardDescription discount={discount} />
              ) : (
                <span className="text-sm font-normal text-neutral-600">
                  No referral discount created
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
            {!discount && group.slug !== DEFAULT_PARTNER_GROUP.slug && (
              <CopyDefaultDiscountButton />
            )}
            <Button
              text={discount ? "Edit" : "Create"}
              variant={discount ? "secondary" : "primary"}
              className="h-9 w-full rounded-lg md:w-fit"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(true);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

const CopyDefaultDiscountButton = () => {
  const { group: defaultGroup } = useGroup({
    groupIdOrSlug: DEFAULT_PARTNER_GROUP.slug,
  });

  const { DiscountSheet, setIsOpen } = useDiscountSheet({
    defaultDiscountValues: defaultGroup?.discount ?? undefined,
  });

  return defaultGroup?.discount ? (
    <>
      {DiscountSheet}
      <Button
        text="Duplicate default group"
        variant="secondary"
        className="animate-fade-in h-9 w-full rounded-lg md:w-fit"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
      />
    </>
  ) : null;
};

const DiscountSkeleton = () => {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-neutral-50 p-6">
      <div className="flex size-10 animate-pulse items-center justify-center rounded-full border border-neutral-200 bg-neutral-100" />
      <div className="flex flex-1 items-center justify-between">
        <div className="h-4 w-64 animate-pulse rounded bg-neutral-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-neutral-100" />
      </div>
    </div>
  );
};
