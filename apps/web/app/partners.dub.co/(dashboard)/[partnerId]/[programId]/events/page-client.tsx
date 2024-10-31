"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MaxWidthWrapper } from "@dub/ui";
import { CursorRays, InvoiceDollar, UserCheck } from "@dub/ui/src/icons";

const emptyStateIcons = [CursorRays, UserCheck, InvoiceDollar];

export function EventsPageClient() {
  return (
    <MaxWidthWrapper>
      <AnimatedEmptyState
        title="Events"
        description="View a real-time events stream for your referral activity"
        cardContent={(idx) => {
          const Icon = emptyStateIcons[idx % emptyStateIcons.length];
          return (
            <>
              <Icon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          );
        }}
        pillContent="Coming soon"
      />
    </MaxWidthWrapper>
  );
}
