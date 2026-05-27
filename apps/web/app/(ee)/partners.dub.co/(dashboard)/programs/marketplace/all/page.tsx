import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ChevronRight, Shop } from "@dub/ui";
import Link from "next/link";
import { MarketplaceAllProgramsPageClient } from "./page-client";

export default function MarketplaceAllProgramsPage() {
  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <Link
              href="/programs/marketplace"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <Shop className="text-content-default size-4" />
            </Link>
            <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
          </div>

          <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
            All Programs
          </span>
        </div>
      }
    >
      <PageWidthWrapper>
        <MarketplaceAllProgramsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
