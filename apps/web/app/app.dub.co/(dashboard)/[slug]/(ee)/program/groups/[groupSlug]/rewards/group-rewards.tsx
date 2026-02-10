"use client";

import useGroup from "@/lib/swr/use-group";
import type { GroupProps, RewardProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { useRewardHistorySheet } from "@/ui/activity-logs/reward-history-sheet";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import {
  RewardSheet,
  useRewardSheet,
} from "@/ui/partners/rewards/add-edit-reward-sheet";
import { EventType } from "@dub/prisma/client";
import { Button, TimestampTooltip, useRouterStuff } from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const REWARD_EVENT_DESCRIPTIONS: Record<
  EventType,
  { title: string; description: string }
> = {
  sale: {
    title: "Sale reward",
    description: "Reward when revenue is generated",
  },
  lead: {
    title: "Lead reward",
    description: "Reward for sign ups or demos",
  },
  click: {
    title: "Click reward",
    description: "Reward for traffic and reach",
  },
};

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

  const {
    hasActivityLogs,
    finalActivityLogDate,
    rewardHistorySheet,
    setIsOpen: setHistoryOpen,
  } = useRewardHistorySheet({
    reward: reward ?? null,
  });

  const Icon = REWARD_EVENTS[event].icon;
  const As = reward ? Link : "div";

  return (
    <>
      {RewardSheet}
      {rewardHistorySheet}
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
          <div className="flex w-full items-center gap-2">
            {reward ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="text-sm font-normal">
                  <ProgramRewardDescription
                    reward={reward}
                    amountClassName="text-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs font-medium text-neutral-500">
                  <span>Last updated </span>
                  {!finalActivityLogDate ? (
                    <div className="h-3 w-16 animate-pulse rounded bg-neutral-100" />
                  ) : (
                    <TimestampTooltip
                      timestamp={finalActivityLogDate}
                      side="left"
                      rows={["local", "utc", "unix"]}
                    >
                      <span>
                        {formatDate(finalActivityLogDate, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </TimestampTooltip>
                  )}

                  {!hasActivityLogs ? (
                    <div className="ml-1 h-3 w-20 animate-pulse rounded bg-neutral-100" />
                  ) : (
                    <>
                      <span
                        className="ml-1 size-1 shrink-0 rounded-full bg-neutral-400"
                        aria-hidden
                      />
                      <Button
                        variant="outline"
                        text="View history"
                        className="h-4 w-fit px-1 py-0.5 text-xs font-medium text-neutral-500"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHistoryOpen(true);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-900">
                  {REWARD_EVENT_DESCRIPTIONS[event].title}
                </span>
                <span className="text-sm font-normal text-neutral-500">
                  {REWARD_EVENT_DESCRIPTIONS[event].description}
                </span>
              </div>
            )}
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
