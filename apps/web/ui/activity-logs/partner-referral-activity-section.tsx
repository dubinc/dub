"use client";

import { usePartnerActivityLogs } from "@/lib/swr/use-partner-activity-logs";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import {
  ActivityFeed,
  ActivityFeedSkeleton,
} from "@/ui/activity-logs/activity-feed";
import { ActivityLogProvider } from "@/ui/activity-logs/activity-log-context";

export function PartnerReferralActivitySection({
  referralId,
}: {
  referralId: string;
}) {
  const { programEnrollment } = useProgramEnrollment();

  const { activityLogs, loading, error } = usePartnerActivityLogs({
    query: {
      resourceType: "referral",
      resourceId: referralId,
    },
    enabled: !!referralId,
  });

  const logs = activityLogs ?? [];
  const program = programEnrollment?.program;

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
        <ActivityLogProvider program={program} view="partner">
          <ActivityFeed logs={logs} resourceType="referral" />
        </ActivityLogProvider>
      )}
    </section>
  );
}
