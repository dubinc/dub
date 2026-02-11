import { ActivityLog, ActivityLogResourceType } from "@/lib/types";
import { PartnerGroupActivityItem } from "@/ui/activity-logs/partner-group-activity-item";
import { ReferralActivityItem } from "@/ui/activity-logs/referral-activity-item";
import { RewardActivityItem } from "@/ui/activity-logs/reward-activity-item";
import { ComponentType } from "react";

const ACTIVITY_ITEM_MAP: Record<
  ActivityLogResourceType,
  ComponentType<{ log: ActivityLog; isLast?: boolean }>
> = {
  partner: PartnerGroupActivityItem,
  referral: ReferralActivityItem,
  clickReward: RewardActivityItem,
  leadReward: RewardActivityItem,
  saleReward: RewardActivityItem,
};

interface ActivityFeedProps {
  logs: ActivityLog[];
  resourceType: ActivityLogResourceType;
}

export function ActivityFeed({ logs, resourceType }: ActivityFeedProps) {
  if (!logs || logs.length === 0) {
    return null;
  }

  const ActivityItemComponent = ACTIVITY_ITEM_MAP[resourceType];

  return (
    <ul className="flex min-w-0 flex-col" role="list">
      {logs.map((log, index) => (
        <ActivityItemComponent
          key={log.id}
          log={log}
          isLast={index === logs.length - 1}
        />
      ))}
    </ul>
  );
}

export function ActivityFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="flex min-w-0 flex-col" role="list">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="relative flex min-w-0 gap-3">
          {i < count - 1 && (
            <div
              className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-neutral-200"
              aria-hidden="true"
            />
          )}
          <div className="flex size-6 shrink-0 items-center justify-center">
            <div className="size-5 animate-pulse rounded-full bg-neutral-200" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pb-6">
            <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}
