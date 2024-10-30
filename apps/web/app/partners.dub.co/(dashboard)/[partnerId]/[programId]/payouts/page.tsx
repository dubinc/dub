import { PageContent } from "@/ui/layout/page-content";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Calendar6, MaxWidthWrapper } from "@dub/ui";
import { Verified } from "lucide-react";

export default function ProgramPayouts() {
  return (
    <PageContent title="Payouts">
      <MaxWidthWrapper>
        <AnimatedEmptyState
          title="Payouts"
          description="Withdraw funds and view your payout history"
          cardContent={
            <>
              <Calendar6 className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <Verified className="size-3.5" />
              </div>
            </>
          }
          pillContent="Coming soon"
        />
      </MaxWidthWrapper>
    </PageContent>
  );
}
