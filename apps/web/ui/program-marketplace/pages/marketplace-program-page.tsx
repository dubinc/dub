import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { prisma } from "@/lib/prisma";
import { ApplicationAnalytics } from "@/ui/application-analytics";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { MarketplaceProgramDetailBody } from "@/ui/program-marketplace/marketplace-program-detail-body";
import { MarketplaceProgramDetailsLayout } from "@/ui/program-marketplace/marketplace-program-details-layout";
import { MarketplaceProgramHero } from "@/ui/program-marketplace/marketplace-program-hero";
import { MarketplaceProgramPageSkeleton } from "@/ui/program-marketplace/marketplace-program-page-skeleton";
import { ChevronRight, Shop } from "@dub/ui";
import { Category } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MarketplaceProgramHeaderControls } from "../marketplace-program-header-controls";
import { ProgramStatusBadge } from "../program-status-badge";
import { getMarketplaceHref } from "../utils/urls";

export const revalidate = 3600; // 1 hour

export async function generateMarketplaceProgramStaticParams() {
  const programs = await prisma.program.findMany({
    where: {
      addedToMarketplaceAt: {
        not: null,
      },
    },
    select: {
      slug: true,
    },
  });

  const categoryPages = Object.values(Category).map((category) => ({
    segments: ["c", category.toLowerCase()],
  }));

  const programPages = programs.map((program) => ({
    segments: [program.slug],
  }));

  return [
    { segments: [] },
    { segments: ["all"] },
    ...categoryPages,
    ...programPages,
  ];
}

export function MarketplaceProgramPage({
  programSlug,
}: {
  programSlug: string;
}) {
  return (
    <Suspense fallback={<MarketplaceProgramPageSkeleton />}>
      <MarketplaceProgramPageContent programSlug={programSlug} />
    </Suspense>
  );
}

async function MarketplaceProgramPageContent({
  programSlug,
}: {
  programSlug: string;
}) {
  const program = await getNetworkProgram({
    slug: programSlug,
  });

  if (!program) {
    redirect(getMarketplaceHref());
  }

  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <Link
              href={getMarketplaceHref()}
              aria-label="Back to marketplace"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <Shop className="text-content-default size-4" />
            </Link>
            <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
              Program details
            </span>
            <ProgramStatusBadge program={program} />
          </div>
        </div>
      }
      controls={<MarketplaceProgramHeaderControls program={program} />}
    >
      <ApplicationAnalytics />
      <PageWidthWrapper className="pb-20">
        <MarketplaceProgramDetailsLayout
          hero={<MarketplaceProgramHero program={program} />}
        >
          <MarketplaceProgramDetailBody program={program} showEligibilityCard />
        </MarketplaceProgramDetailsLayout>
      </PageWidthWrapper>
    </PageContent>
  );
}
