"use client";

import useGroup from "@/lib/swr/use-group";
import type { GroupProps, RewardProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import {
  RewardSheet,
  useRewardSheet,
} from "@/ui/partners/rewards/add-edit-reward-sheet";
import { X } from "@/ui/shared/icons";
import { EventType } from "@dub/prisma/client";
import {
  Button,
  buttonVariants,
  Gift,
  Grid,
  useLocalStorage,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export function GroupRewards() {
  const { group, loading } = useGroup();
  const { searchParams } = useRouterStuff();

  const [rewardSheetState, setRewardSheetState] = useState<
    { open: false; rewardId: string | null } | { open: true; rewardId: string }
  >({ open: false, rewardId: null });

  useEffect(() => {
    const rewardId = searchParams.get("rewardId");

    if (rewardId) {
      setRewardSheetState({ open: true, rewardId });
    } else {
      setRewardSheetState({ open: false, rewardId: null });
    }
  }, [searchParams]);

  const rewards =
    [group?.clickReward, group?.leadReward, group?.saleReward].filter(
      Boolean,
    ) ?? [];

  const currentReward = rewardSheetState.rewardId
    ? rewards.find((r) => r?.id === rewardSheetState.rewardId)
    : undefined;
  const isNewReward = rewardSheetState.rewardId?.startsWith("new-");
  const newRewardEvent = isNewReward
    ? (rewardSheetState.rewardId?.replace("new-", "") as EventType)
    : undefined;

  return (
    <div>
      {rewardSheetState.rewardId && (currentReward || isNewReward) && (
        <RewardSheetWrapper
          reward={currentReward}
          event={newRewardEvent}
          isOpen={rewardSheetState.open}
          setIsOpen={(open) =>
            setRewardSheetState((s) => ({ ...s, open }) as any)
          }
        />
      )}

      <Banner />

      <div className="flex flex-col gap-6">
        {loading || !group ? (
          <>
            <RewardSkeleton />
            <RewardSkeleton />
            <RewardSkeleton />
          </>
        ) : (
          <>
            <RewardItem reward={group.saleReward} event="sale" group={group} />
            <RewardItem reward={group.leadReward} event="lead" group={group} />
            <RewardItem
              reward={group.clickReward}
              event="click"
              group={group}
            />
          </>
        )}
      </div>
    </div>
  );
}

const RewardSheetWrapper = ({
  reward,
  event,
  isOpen,
  setIsOpen,
}: {
  reward?: RewardProps | null;
  event?: EventType;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  return (
    <RewardSheet
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      event={event || reward?.event || "sale"}
      reward={reward || undefined}
    />
  );
};

const RewardItem = ({
  reward,
  event,
  group,
}: {
  reward?: RewardProps | null;
  event: EventType;
  group: GroupProps;
}) => {
  const { slug } = useParams();
  const { queryParams } = useRouterStuff();

  const { RewardSheet, setIsOpen } = useRewardSheet({
    event,
    reward: reward || undefined,
  });

  const Icon = REWARD_EVENTS[event].icon;
  const As = reward ? Link : "div";

  return (
    <>
      {RewardSheet}
      <As
        href={
          reward
            ? `/${slug}/program/groups/${group.slug}/rewards?rewardId=${reward.id}`
            : ""
        }
        scroll={false}
        className={cn(
          "flex flex-col gap-4 rounded-lg p-6 transition-all md:flex-row md:items-center",
          reward &&
            "cursor-pointer border border-neutral-200 hover:border-neutral-300",
          !reward && "bg-neutral-50 hover:bg-neutral-100",
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <Icon className="size-4 text-neutral-600" />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-y-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal">
              {reward ? (
                <ProgramRewardDescription
                  reward={reward}
                  amountClassName="text-blue-600"
                />
              ) : (
                <span className="text-sm font-normal text-neutral-600">
                  No {event} reward configured
                </span>
              )}
            </span>
          </div>

          {reward ? (
            <Button
              text="Edit"
              variant="secondary"
              className="h-9 w-fit rounded-lg"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                queryParams({
                  set: {
                    rewardId: reward.id,
                  },
                  scroll: false,
                });
              }}
            />
          ) : (
            <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
              {group.slug !== DEFAULT_PARTNER_GROUP.slug && (
                <CopyDefaultRewardButton event={event} />
              )}
              <Button
                text="Create"
                variant="primary"
                className="h-9 w-full rounded-lg md:w-fit"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </As>
    </>
  );
};

const CopyDefaultRewardButton = ({ event }: { event: EventType }) => {
  const { group: defaultGroup } = useGroup({
    groupIdOrSlug: DEFAULT_PARTNER_GROUP.slug,
  });

  const defaultReward = defaultGroup?.[`${event}Reward`];

  const { RewardSheet, setIsOpen } = useRewardSheet({
    event,
    defaultRewardValues: defaultReward ?? undefined,
  });

  return defaultReward ? (
    <>
      {RewardSheet}
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

const RewardSkeleton = () => {
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
    "program-rewards-banner-dismissed",
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
      {...(dismissedBanner && { inert: "" })}
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
            <Gift className="size-6" />
            <div>
              <h2 className="text-content-emphasis text-base font-semibold">
                Rewards
              </h2>
              <p className="text-content-subtle text-base font-normal leading-6">
                Rewards offered to all partners enrolled in this group
              </p>
            </div>
            <a
              href="https://dub.co/help/article/partner-rewards"
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
