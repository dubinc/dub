"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import useGroup from "@/lib/swr/use-group";
import { RewardProps } from "@/lib/types";
import { REWARD_EVENT_TO_RESOURCE_TYPE } from "@/lib/zod/schemas/activity-log";
import {
  ActivityFeed,
  ActivityFeedSkeleton,
} from "@/ui/activity-logs/activity-feed";

export function RewardActivitySection({
  reward,
}: {
  reward: Pick<RewardProps, "id" | "event">;
}) {
  const { group } = useGroup();

  const resourceType = REWARD_EVENT_TO_RESOURCE_TYPE[reward.event];

  const { activityLogs, loading, error } = useActivityLogs({
    query: {
      resourceType,
      ...(group ? { parentResourceId: group.id } : {}),
    },
    enabled: !!reward.id,
  });

  if (loading) {
    return <ActivityFeedSkeleton count={3} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-neutral-500">
          Failed to load history. Please try again.
        </p>
      </div>
    );
  }

  if (!activityLogs || activityLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-neutral-500">No reward history yet</p>
      </div>
    );
  }

  return <ActivityFeed logs={activityLogs} resourceType={resourceType} />;
}
