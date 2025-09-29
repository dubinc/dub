"use client";

import useGroup from "@/lib/swr/use-group";
import type { DiscountProps, GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { useDiscountSheet } from "@/ui/partners/discounts/add-edit-discount-sheet";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  Discount,
  Grid,
  useLocalStorage,
} from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { BadgePercent } from "lucide-react";
import { motion } from "motion/react";

export const GroupDiscounts = () => {
  const { group, loading } = useGroup();

  return (
    <div>
      <Banner />

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

const Banner = () => {
  const [dismissedBanner, setDismissedBanner] = useLocalStorage<boolean>(
    "program-discount-banner-dismissed",
    false,
  );

  return (
    <motion.div
      animate={
        dismissedBanner
          ? { opacity: 0, height: 0 }
          : { opacity: 1, height: "auto" }
      }
      initial={false}
      className="overflow-hidden"
      {...(dismissedBanner && { inert: true })}
    >
      <div className="pb-6">
        <div className="relative isolate overflow-hidden rounded-xl bg-neutral-100">
          <div
            className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(90deg,transparent,black)]"
            aria-hidden
          >
            <div className="absolute right-0 top-0 h-full w-[600px]">
              <Grid
                cellSize={60}
                patternOffset={[1, -30]}
                className="text-neutral-200"
              />
            </div>
            <div className="absolute -inset-16 opacity-15 blur-[50px] [transform:translateZ(0)]">
              <div
                className="absolute right-0 top-0 h-full w-[350px] -scale-y-100 rounded-l-full saturate-150"
                style={{
                  backgroundImage: `conic-gradient(from -66deg, #855AFC -32deg, #FF0000 63deg, #EAB308 158deg, #5CFF80 240deg, #855AFC 328deg, #FF0000 423deg)`,
                }}
              />
            </div>
          </div>
          <div className="relative flex flex-col gap-4 p-5">
            <Discount className="size-6" />
            <div>
              <h2 className="text-content-emphasis text-base font-semibold">
                Referral discounts
              </h2>
              <p className="text-content-subtle text-base font-normal leading-6">
                Discounts offered to customers when referred by partners in this
                group
              </p>
            </div>
            <a
              href="https://dub.co/help/article/dual-sided-incentives"
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-8 w-fit items-center rounded-lg border bg-white px-3 text-sm",
              )}
            >
              Learn more
            </a>
          </div>

          <button
            type="button"
            className="text-content-emphasis absolute right-4 top-4 flex size-7 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-black/5 active:bg-black/10"
            onClick={() => setDismissedBanner(true)}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
