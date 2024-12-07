import { PageContent } from "@/ui/layout/page-content";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MaxWidthWrapper } from "@dub/ui";
import { Folder, Globe } from "@dub/ui/src/icons";

export default function MarketplacePage() {
  return (
    <PageContent title="Marketplace">
      <MaxWidthWrapper>
        <AnimatedEmptyState
          title="Marketplace"
          description="Explore and discover other partnerships with companies and products."
          cardContent={
            <>
              <Folder className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <Globe className="size-3.5" />
              </div>
            </>
          }
          pillContent="Coming soon"
        />
      </MaxWidthWrapper>
    </PageContent>
  );
}
