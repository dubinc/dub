"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import { ActivityFeed, ActivityFeedSkeleton } from "./activity-item";

export function ReferralActivitySection({
  referralId,
}: {
  referralId: string;
}) {
  const { activityLogs, loading, error } = useActivityLogs({
    query: {
      resourceType: "referral",
      resourceId: referralId,
    },
    enabled: !!referralId,
  });

  const logs = activityLogs ?? [];

  if (loading) {
    return (
      <section className="order-3 col-span-full flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-900">Activity</h3>
        <ActivityFeedSkeleton count={3} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="order-3 col-span-full flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-900">Activity</h3>
        <p className="text-sm text-neutral-500">
          Failed to load activity. Please try again.
        </p>
      </section>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <section className="order-3 col-span-full flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-neutral-900">Activity</h3>
      <ActivityFeed logs={logs} />
    </section>
  );
}
