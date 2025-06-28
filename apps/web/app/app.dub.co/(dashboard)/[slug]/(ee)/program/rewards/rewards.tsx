"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";
import useRewards from "@/lib/swr/use-rewards";
import type { RewardProps } from "@/lib/types";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { useRewardSheet } from "@/ui/partners/add-edit-reward-sheet";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { EventType } from "@dub/prisma/client";
import { Badge, Button, Popover, useKeyboardShortcut } from "@dub/ui";
import { pluralize } from "@dub/utils";
import { Gift } from "lucide-react";
import { useState } from "react";

export function Rewards() {
  return (
    <div className="flex flex-col gap-6">
      <DefaultRewards />
      <AdditionalRewards />
    </div>
  );
}

const DefaultRewards = () => {
  const { rewards, loading } = useRewards();

  const defaultClickReward = rewards?.find(
    (r) => r.event === "click" && r.default,
  );

  const defaultLeadReward = rewards?.find(
    (r) => r.event === "lead" && r.default,
  );

  const defaultSaleReward = rewards?.find(
    (r) => r.event === "sale" && r.default,
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
              Default Rewards
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Rewards offered to all partners enrolled in your program
            </p>
          </div>
        </div>
        {loading ? (
          <>
            <RewardSkeleton />
            <RewardSkeleton />
            <RewardSkeleton />
          </>
        ) : (
          <>
            <RewardItem reward={defaultSaleReward} event="sale" isDefault />
            <RewardItem reward={defaultLeadReward} event="lead" isDefault />
            <RewardItem reward={defaultClickReward} event="click" isDefault />
          </>
        )}
      </div>
    </div>
  );
};

const AdditionalRewards = () => {
  const { rewards, loading } = useRewards();

  const additionalRewards = rewards?.filter((reward) => !reward.default);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
              Additional Rewards
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Custom rewards for specific partners that override the default
              rewards
            </p>
          </div>
          <CreateRewardButton />
        </div>
        {loading ? (
          <div className="flex flex-col gap-4">
            <RewardSkeleton />
            <RewardSkeleton />
          </div>
        ) : additionalRewards && additionalRewards.length > 0 ? (
          <div className="flex flex-col gap-4">
            {additionalRewards.map((reward) => (
              <RewardItem
                key={reward.id}
                reward={reward}
                event={reward.event}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-neutral-50 py-12">
            <div className="flex items-center justify-center">
              <Gift className="size-6 text-neutral-800" />
            </div>
            <div className="flex flex-col items-center gap-1 px-4 text-center">
              <p className="text-base font-medium text-neutral-900">
                Additional Rewards
              </p>
              <p className="text-sm text-neutral-600">
                No additional rewards have been added yet
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CreateRewardButton = () => {
  const [openPopover, setOpenPopover] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const { RewardSheet, setIsOpen } = useRewardSheet({
    event: selectedEvent || "sale",
  });

  useKeyboardShortcut(
    Object.values(REWARD_EVENTS).map((type) => type.shortcut.toLowerCase()),
    (e) => {
      setOpenPopover(false);

      const eventType = Object.values(REWARD_EVENTS).find(
        (type) => type.shortcut.toLowerCase() === e.key,
      );

      if (eventType) {
        setSelectedEvent(eventType.event as EventType);
        setIsOpen(true);
      }
    },
    {
      enabled: openPopover,
    },
  );

  return (
    <>
      <Popover
        content={
          <div className="w-full p-2 md:w-48">
            <div className="grid gap-px">
              {Object.values(REWARD_EVENTS).map((type) => (
                <Button
                  key={type.event}
                  text={type.text}
                  icon={<type.icon className="size-4" />}
                  variant="outline"
                  onClick={() => {
                    setSelectedEvent(type.event as EventType);
                    setIsOpen(true);
                    setOpenPopover(false);
                  }}
                  shortcut={type.shortcut}
                  className="h-9 px-2"
                />
              ))}
            </div>
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="end"
      >
        <Button
          text="Create reward"
          variant="primary"
          className="h-8 w-fit"
          onClick={() => setOpenPopover(!openPopover)}
          right={
            <svg
              className="h-4 w-4 transition-all group-hover:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          }
        />
      </Popover>
      {RewardSheet}
    </>
  );
};

const RewardSkeleton = () => {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex size-10 animate-pulse items-center justify-center rounded-full border border-neutral-200 bg-neutral-100" />
      <div className="flex flex-1 items-center justify-between">
        <div className="h-4 w-64 animate-pulse rounded bg-neutral-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-neutral-100" />
      </div>
    </div>
  );
};

const RewardItem = ({
  reward,
  event,
  isDefault = false,
}: {
  reward?: RewardProps;
  event: EventType;
  isDefault?: boolean;
}) => {
  const { RewardSheet, setIsOpen } = useRewardSheet({
    event,
    reward,
    isDefault,
  });

  const { partnersCount: rewardPartnersCount, loading: partnersCountLoading } =
    usePartnersCount<
      | (RewardProps & {
          partnersCount: number;
        })[]
      | undefined
    >({
      groupBy: REWARD_EVENT_COLUMN_MAPPING[event],
      enabled: !isDefault,
    });

  const partnerCount =
    !isDefault && reward
      ? (rewardPartnersCount || []).find((r) => r.id === reward.id)
          ?.partnersCount
      : undefined;

  const Icon = REWARD_EVENTS[event].icon;

  return (
    <>
      <div
        className="flex cursor-pointer items-center gap-4 rounded-lg border border-neutral-200 p-4 transition-all hover:border-neutral-300"
        onClick={() => setIsOpen(true)}
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
                  No default {event} reward configured
                </span>
              )}
            </span>
          </div>

          {isDefault ? (
            reward ? (
              <Badge variant="gray">All partners</Badge>
            ) : (
              <Button
                text="Create"
                variant="primary"
                className="h-8 w-fit"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                }}
              />
            )
          ) : partnersCountLoading ? (
            <div className="h-4 w-24 animate-pulse rounded-full bg-neutral-100" />
          ) : (
            <Badge variant="green">
              {partnerCount} {pluralize("partner", partnerCount || 0)}
            </Badge>
          )}
        </div>
      </div>
      {RewardSheet}
    </>
  );
};
