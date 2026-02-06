"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import {
  ActivityFeed,
  ActivityFeedSkeleton,
} from "@/ui/activity-logs/activity-feed";

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

  if (logs.length === 0 && !loading && !error) {
    return null;
  }

  return (
    <section className="order-3 col-span-full flex flex-col gap-3 px-1">
      {!loading && (
        <h3 className="text-content-emphasis text-base font-semibold">
          Activity
        </h3>
      )}

      {loading ? (
        <ActivityFeedSkeleton count={3} />
      ) : error ? (
        <p className="text-sm text-neutral-500">
          Failed to load activity. Please try again.
        </p>
      ) : (
        <ActivityFeed logs={logs} resourceType="referral" />
      )}
    </section>
  );
}
