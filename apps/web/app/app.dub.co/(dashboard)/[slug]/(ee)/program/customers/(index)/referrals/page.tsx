"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { UserCheck } from "@dub/ui";

export default function PartnerCustomersReferralsPage() {
  const submittedReferralsEnabled = true; // TODO: Add check based on the program's rewards

  return (
    <AnimatedEmptyState
      title={
        submittedReferralsEnabled
          ? "No referrals submitted"
          : "Submitted referrals not enabled"
      }
      description={
        submittedReferralsEnabled
          ? "Allow partners to submit leads and track their progress through the sales process."
          : "Partners can still earn from regular referrals."
      }
      // TODO: Add "learn more" URLs
      learnMoreHref={
        submittedReferralsEnabled
          ? "https://dub.co/help/article/partner-rewards"
          : "https://dub.co/help/article/partner-rewards"
      }
      cardContent={
        <>
          <UserCheck className="text-content-default size-4" />
          <div className="bg-bg-emphasis h-2.5 w-24 min-w-0 rounded-sm" />
        </>
      }
    />
  );
}
