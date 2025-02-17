"use client";

import useProgram from "@/lib/swr/use-program";
import useRewards from "@/lib/swr/use-rewards";
import type { Reward } from "@/lib/types";
import { useRewardSheet } from "@/ui/partners/add-edit-reward-sheet";
import { EventType } from "@dub/prisma/client";
import { Badge, Button, IconMenu, MoneyBill, Popover } from "@dub/ui";
import { BoltFill, CurrencyDollar, Users2 } from "@dub/ui/icons";
import { Gift } from "lucide-react";
import { useState } from "react";

export function RewardSettings() {
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
              The default rewarded offered to all partners
            </p>
          </div>
        </div>
        {loading ? (
          <RewardSkeleton />
        ) : defaultReward ? (
          <Reward reward={defaultReward} />
        ) : (
          <>
            <EmptyState
              event="sale"
              title="No default reward created"
              description="Create a default reward that will be offered to all partners"
              onClick={() => setIsOpen(true)}
            />
            {RewardSheet}
          </>
        )}
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
          <EmptyState
            title="Additional Rewards"
            description="No additional rewards have been added yet"
          />
        )}
      </div>
    </div>
  );
};

const Reward = ({ reward }: { reward: Reward }) => {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white">
        <MoneyBill className="size-5 text-neutral-600" />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal">
            <RewardDescription reward={reward} />
          </span>
        </div>
        {reward.partnersCount > 0 ? (
          <Badge variant="green">{reward.partnersCount} partners</Badge>
        ) : (
          <Badge variant="gray">All partners</Badge>
        )}
      </div>
    </div>
  );
};

const RewardDescription = ({ reward }: { reward: Reward }) => {
  const amount =
    reward.type === "percentage"
      ? `${reward.amount}%`
      : `$${(reward.amount / 100).toFixed(2)}`;

  const eventText = {
    click: "click",
    lead: "signup",
    sale: "sale",
  }[reward.event];

  const getRecurringText = () => {
    if (reward.maxDuration === null) {
      return ", and again for every conversion of the customers lifetime";
    }
    if (reward.maxDuration === 0) {
      return ""; // No recurring text for one-time rewards
    }
    return `, and again for every conversion of ${reward.maxDuration} months`;
  };

  return (
    <>
      Earn <span className="text-blue-500">{amount}</span> for each {eventText}
      {reward.event === "sale" && (
        <span className="text-neutral-900">{getRecurringText()}</span>
      )}
    </>
  );
};

const CreateRewardButton = () => {
  const [openPopover, setOpenPopover] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const { RewardSheet, setIsOpen } = useRewardSheet({
    event: selectedEvent || "sale", // default to sale, but it won't show unless setIsOpen is true
  });

  const rewardTypes = [
    {
      key: "click",
      text: "Click reward",
      icon: <BoltFill className="size-4" />,
      event: "click" as const,
    },
    {
      key: "lead",
      text: "Lead reward",
      icon: <Users2 className="size-4" />,
      event: "lead" as const,
    },
    {
      key: "sale",
      text: "Sale reward",
      icon: <CurrencyDollar className="size-4" />,
      event: "sale" as const,
    },
  ];

  return (
    <>
      <Popover
        content={
          <div className="w-full p-2 md:w-48">
            <div className="grid gap-px">
              {rewardTypes.map((type) => (
                <button
                  key={type.key}
                  className="w-full rounded-md p-2 text-left text-sm hover:bg-neutral-100 active:bg-neutral-200"
                  onClick={() => {
                    setSelectedEvent(type.event);
                    setIsOpen(true);
                    setOpenPopover(false);
                  }}
                >
                  <IconMenu text={type.text} icon={type.icon} />
                </button>
              ))}
            </div>
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="end"
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="group inline-flex items-center justify-center gap-1 rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-700 active:bg-gray-800"
        >
          <span>Create reward</span>
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
        </button>
      </Popover>
      {RewardSheet}
    </>
  );
};

const RewardSkeleton = () => {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50" />
      <div className="flex flex-1 items-center justify-between">
        <div className="space-y-3">
          <div className="h-4 w-64 rounded bg-neutral-100" />
          <div className="h-4 w-32 rounded bg-neutral-100" />
        </div>
        <div className="h-6 w-24 rounded-full bg-neutral-100" />
      </div>
    </div>
  );
};

const EmptyState = ({
  title,
  description,
  event,
  onClick,
}: {
  title: string;
  description: string;
  event?: EventType;
  onClick?: () => void;
}) => {
  if (event === "sale") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-full border border-neutral-300">
            <MoneyBill className="size-5" />
          </div>
          <p className="text-sm text-neutral-600">No default reward created</p>
        </div>
        <Button
          text="Create default reward"
          variant="primary"
          className="h-[32px] w-fit"
          onClick={onClick}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-neutral-50 py-12">
      <div className="flex items-center justify-center">
        <Gift className="size-6 text-neutral-800" />
      </div>
      <div className="flex flex-col items-center gap-1 px-4 text-center">
        <p className="text-base font-medium text-neutral-900">{title}</p>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    </div>
  );
};
