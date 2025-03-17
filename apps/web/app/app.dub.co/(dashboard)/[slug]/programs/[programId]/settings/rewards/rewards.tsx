"use client";

import useProgram from "@/lib/swr/use-program";
import useRewards from "@/lib/swr/use-rewards";
import type { RewardProps } from "@/lib/types";
import { useRewardSheet } from "@/ui/partners/add-edit-reward-sheet";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { EventType } from "@dub/prisma/client";
import {
  Badge,
  Button,
  MoneyBill,
  Popover,
  useKeyboardShortcut,
} from "@dub/ui";
import { pluralize } from "@dub/utils";
import { Gift } from "lucide-react";
import { useState } from "react";

export function Rewards() {
  return (
    <div className="flex flex-col gap-6">
      <SaleReward />
      <AdditionalRewards />
    </div>
  );
}

const SaleReward = () => {
  const { program } = useProgram();
  const { rewards, loading } = useRewards();

  const defaultReward =
    program?.defaultRewardId &&
    rewards?.find((r) => r.id === program.defaultRewardId);

  const { RewardSheet, setIsOpen } = useRewardSheet({
    event: "sale",
  });

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
              Sale Reward <Badge variant="gray">Default</Badge>
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              The default reward offered to all partners
            </p>
          </div>
        </div>
        {loading ? (
          <RewardSkeleton />
        ) : defaultReward ? (
          <Reward reward={defaultReward} />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 p-4">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full border border-neutral-300">
                <MoneyBill className="size-5" />
              </div>
              <p className="text-sm text-neutral-600">
                No default reward created
              </p>
            </div>
            <Button
              text="Create default reward"
              variant="primary"
              className="h-9 w-fit"
              onClick={() => setIsOpen(true)}
            />
          </div>
        )}

        {RewardSheet}
      </div>
    </div>
  );
};

const AdditionalRewards = () => {
  const { program } = useProgram();
  const { rewards, loading } = useRewards();

  const additionalRewards = rewards?.filter(
    (reward) => reward.id !== program?.defaultRewardId,
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900">
              Additional Rewards
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Add more reward types or reward groups
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
              <Reward key={reward.id} reward={reward} />
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

const Reward = ({ reward }: { reward: RewardProps }) => {
  const { RewardSheet, setIsOpen } = useRewardSheet({
    event: reward.event,
    reward,
  });

  const Icon = REWARD_EVENTS[reward.event].icon;

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
              <ProgramRewardDescription
                reward={reward}
                hideIfZero={false}
                amountClassName="text-blue-600"
              />
            </span>
          </div>
          {reward.partnersCount && reward?.partnersCount > 0 ? (
            <Badge variant="green">
              {reward.partnersCount}{" "}
              {pluralize("partner", reward.partnersCount)}
            </Badge>
          ) : (
            <Badge variant="gray">All partners</Badge>
          )}
        </div>
      </div>
      {RewardSheet}
    </>
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
