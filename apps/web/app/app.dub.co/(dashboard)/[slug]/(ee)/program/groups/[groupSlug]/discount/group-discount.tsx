"use client";

import useGroup from "@/lib/swr/use-group";
import type { DiscountProps } from "@/lib/types";
import { useDiscountSheet } from "@/ui/partners/add-edit-discount-sheet";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { BadgePercent } from "lucide-react";

export const GroupDiscount = () => {
  const { group, loading } = useGroup();

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <DiscountSkeleton />
      ) : (
        <DiscountItem discount={group?.discount} />
      )}
    </div>
  );
};

const DiscountItem = ({ discount }: { discount?: DiscountProps | null }) => {
  const { DiscountSheet, setIsOpen } = useDiscountSheet({
    ...(discount && { discount }),
  });

  return (
    <>
      {DiscountSheet}
      <div
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-lg p-6 transition-all",
          discount && "border border-neutral-200 hover:border-neutral-300",
          !discount && "bg-neutral-50 hover:bg-neutral-100",
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <BadgePercent className="size-4 text-neutral-600" />
        </div>
        <div className="flex flex-1 items-center justify-between">
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

          <Button
            text={discount ? "Edit" : "Create"}
            variant={discount ? "secondary" : "primary"}
            className="h-9 w-fit rounded-lg"
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(true);
            }}
          />
        </div>
      </div>
    </>
  );
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
