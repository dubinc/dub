"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import { RewardProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { Dispatch, SetStateAction, useState } from "react";
import { RewardActivitySection } from "./reward-activity-section";

const REWARD_EVENT_TITLES: Record<RewardProps["event"], string> = {
  sale: "Sale reward history",
  lead: "Lead reward history",
  click: "Click reward history",
};

interface RewardHistorySheetProps {
  reward: Pick<RewardProps, "id" | "event"> | null;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function RewardHistorySheetContent({
  reward,
}: Omit<RewardHistorySheetProps, "isOpen" | "setIsOpen">) {
  if (!reward) {
    return null;
  }

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          {REWARD_EVENT_TITLES[reward.event]}
        </Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<X className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <RewardActivitySection rewardId={reward.id} />
      </div>
    </div>
  );
}

export function RewardHistorySheet({
  isOpen,
  ...rest
}: RewardHistorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <RewardHistorySheetContent {...rest} />
    </Sheet>
  );
}

export function useRewardHistorySheet({
  reward,
}: {
  reward: Pick<RewardProps, "id" | "event"> | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { activityLogs } = useActivityLogs({
    query: reward
      ? {
          resourceType: "reward",
          resourceId: reward.id,
        }
      : undefined,
    enabled: !!reward?.id,
  });

  return {
    hasActivityLogs: (activityLogs?.length ?? 0) > 0,
    rewardHistorySheet: reward ? (
      <RewardHistorySheet
        reward={reward}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ) : null,
    setIsOpen,
  };
}
