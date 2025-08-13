"use client";

import useGroup from "@/lib/swr/use-group";
import type { GroupProps, RewardProps } from "@/lib/types";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import {
  RewardSheet,
  useRewardSheet,
} from "@/ui/partners/rewards/add-edit-reward-sheet";
import { EventType } from "@dub/prisma/client";
import { Button, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
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
    <div className="flex flex-col gap-6">
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

      {loading || !group ? (
        <>
          <RewardSkeleton />
          <RewardSkeleton />
          <RewardSkeleton />
        </>
      ) : (
        <>
          <RewardItem reward={group.clickReward} event="click" group={group} />
          <RewardItem reward={group.leadReward} event="lead" group={group} />
          <RewardItem reward={group.saleReward} event="sale" group={group} />
        </>
      )}
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
            ? `/${slug}/program/partners/${group.slug}/rewards?rewardId=${reward.id}`
            : ""
        }
        scroll={false}
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-lg p-6 transition-all",
          reward && "border border-neutral-200 hover:border-neutral-300",
          !reward && "bg-neutral-50 hover:bg-neutral-100",
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <Icon className="size-4 text-neutral-600" />
        </div>
        <div className="flex flex-1 items-center justify-between">
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
              className="h-9 w-fit"
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
            <Button
              text="Create"
              variant="primary"
              className="h-9 w-fit"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(true);
              }}
            />
          )}
        </div>
      </As>
    </>
  );
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
