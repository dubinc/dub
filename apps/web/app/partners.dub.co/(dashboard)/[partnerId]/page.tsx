import { PageContent } from "@/ui/layout/page-content";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CircleDollar, GridIcon, MaxWidthWrapper } from "@dub/ui";

export default function PartnersDashboard() {
  return (
    <PageContent title="Programs">
      <MaxWidthWrapper>
        <AnimatedEmptyState
          title="No programs found"
          description="Enroll in programs to start earning."
          cardContent={
            <>
              <GridIcon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <CircleDollar className="size-3.5" />
              </div>
            </>
          }
          learnMoreHref="https://dub.co/help/article/dub-conversions"
        />
      </MaxWidthWrapper>
    </PageContent>
  );
}
