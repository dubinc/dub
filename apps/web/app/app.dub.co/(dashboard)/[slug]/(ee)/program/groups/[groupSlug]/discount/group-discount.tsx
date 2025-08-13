"use client";

import useGroup from "@/lib/swr/use-group";
import type { DiscountProps } from "@/lib/types";
import { useDiscountSheet } from "@/ui/partners/add-edit-discount-sheet";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { Button, Discount } from "@dub/ui";
import { cn } from "@dub/utils";
import { BadgePercent } from "lucide-react";
import Link from "next/link";

export const GroupDiscount = () => {
  const { group, loading } = useGroup();

  return (
    <div className="flex flex-col gap-6">
      <Banner />

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

const Banner = () => {
  return (
    <div className="flex flex-col gap-6 rounded-xl bg-neutral-100 p-5">
      <Discount className="size-6" />
      <div>
        <h2 className="text-base font-semibold leading-6 text-neutral-900">
          Referral discounts
        </h2>
        <p className="text-base font-normal leading-6 text-neutral-500">
          Discounts offered to customers when referred by all partners in this
          group
        </p>
      </div>
      <Link href="/">
        <Button
          text="Learn more"
          variant="secondary"
          className="h-8 w-fit rounded-lg bg-white"
        />
      </Link>
    </div>
  );
};
