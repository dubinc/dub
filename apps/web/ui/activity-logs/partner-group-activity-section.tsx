"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import {
  ActivityFeed,
  ActivityFeedSkeleton,
} from "@/ui/activity-logs/activity-feed";

export function PartnerGroupActivitySection({
  partnerId,
}: {
  partnerId: string;
}) {
  const { activityLogs, loading, error } = useActivityLogs({
    query: {
      resourceType: "partner",
      resourceId: partnerId,
      action: "partner.groupChanged",
    },
    enabled: !!partnerId,
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
        <p className="text-sm text-neutral-500">No group history yet</p>
      </div>
    );
  }

  return <ActivityFeed logs={activityLogs} resourceType="partner" />;
}
