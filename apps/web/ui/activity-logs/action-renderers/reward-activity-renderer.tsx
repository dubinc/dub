"use client";

import { ActivityLog, ActivityLogAction, RewardProps } from "@/lib/types";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { ProgramRewardModifiersTooltipContent } from "@/ui/partners/program-reward-modifiers-tooltip";
import { TimestampTooltip } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { UserAvatar } from "../activity-entry-chips";

interface RewardActivityConfig {
  title: string;
  field: "new" | "old";
  displayModifiers: boolean;
}

const REWARD_ACTIVITY_CONFIG: Record<
  Extract<
    ActivityLogAction,
    | "reward.created"
    | "reward.updated"
    | "reward.deleted"
    | "reward.conditionAdded"
    | "reward.conditionUpdated"
    | "reward.conditionRemoved"
  >,
  RewardActivityConfig
> = {
  "reward.created": {
    title: "Created reward",
    field: "new",
    displayModifiers: false,
  },
  "reward.updated": {
    title: "Updated reward",
    field: "new",
    displayModifiers: false,
  },
  "reward.deleted": {
    title: "Deleted reward",
    field: "old",
    displayModifiers: false,
  },
  "reward.conditionAdded": {
    title: "Added reward condition",
    field: "new",
    displayModifiers: true,
  },
  "reward.conditionRemoved": {
    title: "Removed reward condition",
    field: "old",
    displayModifiers: true,
  },
  "reward.conditionUpdated": {
    title: "Updated reward condition",
    field: "new",
    displayModifiers: true,
  },
};

interface RewardActivityRendererProps {
  log: ActivityLog;
}

export function RewardActivityRenderer({ log }: RewardActivityRendererProps) {
  if (!log?.action) {
    return null;
  }

  const config = REWARD_ACTIVITY_CONFIG[log.action];
  if (!config) {
    return null;
  }

  const reward = log.changeSet?.reward?.[config.field] as
    | RewardProps
    | undefined;

  if (!reward) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserAvatar user={log.user} />
          <span className="text-sm font-medium leading-5 text-neutral-800">
            {config.title}
          </span>
        </div>

        <TimestampTooltip
          timestamp={log.createdAt}
          side="left"
          rows={["local", "utc", "unix"]}
        >
          <time className="shrink-0 text-xs font-normal text-neutral-500">
            {formatDate(log.createdAt, {
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </TimestampTooltip>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs font-medium leading-4 text-neutral-800">
        {config.displayModifiers ? (
          <ProgramRewardModifiersTooltipContent
            reward={reward}
            showBaseReward={false}
            showBottomGradient={false}
            className="p-0"
          />
        ) : (
          <ProgramRewardDescription
            reward={reward}
            showModifiersTooltip={false}
          />
        )}
      </div>
    </div>
  );
}
