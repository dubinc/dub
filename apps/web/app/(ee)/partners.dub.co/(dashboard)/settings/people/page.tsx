import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { UserCheck } from "@dub/ui";

export default function PeopleSettings() {
  return (
    <PageContent title="People">
      <PageWidthWrapper className="pb-10">
        <AnimatedEmptyState
          title="People"
          description="Add and manage teammates to this partner profile"
          cardContent={
            <>
              <UserCheck className="size-4 text-neutral-700" />
              <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
            </>
          }
          pillContent="Coming soon"
        />
      </PageWidthWrapper>
    </PageContent>
  );
}
