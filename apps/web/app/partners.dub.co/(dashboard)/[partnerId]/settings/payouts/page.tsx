import { PageContent } from "@/ui/layout/page-content";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MaxWidthWrapper } from "@dub/ui";
import { GreekTemple } from "@dub/ui/src/icons";

export default function PayoutsSettings() {
  return (
    <PageContent title="Payouts">
      <MaxWidthWrapper>
        <AnimatedEmptyState
          title="Payouts"
          description="Connect and manage your bank accounts to receive payouts"
          cardContent={
            <>
              <GreekTemple className="size-4 text-neutral-700" />
              <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
            </>
          }
          pillContent="Coming soon"
        />
      </MaxWidthWrapper>
    </PageContent>
  );
}
