import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import {
  getMarketplaceHref,
  slugToCategory,
} from "@/ui/program-marketplace/utils/urls";
import { ChevronRight, Shop } from "@dub/ui";
import { Category } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { MarketplaceHomePage } from "./pages/marketplace-home-page";
import { MarketplaceProgramPage } from "./pages/marketplace-program-page";
import { MarketplaceProgramsListPage } from "./pages/marketplace-programs-list-page";

function MarketplaceListTitle({ category }: { category?: Category }) {
  const title = category
    ? PROGRAM_CATEGORIES_MAP[category]?.label ?? category.replaceAll("_", " ")
    : "All Programs";

  return (
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
      <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
        {title}
      </span>
    </div>
  );
}

export function MarketplaceRouter({ segments = [] }: { segments?: string[] }) {
  if (segments.length === 0) {
    return (
      <PageContent title="Program marketplace">
        <PageWidthWrapper className="pb-10">
          <MarketplaceHomePage />
        </PageWidthWrapper>
      </PageContent>
    );
  }

  if (segments.length === 1 && segments[0] === "all") {
    return <ListPage title={<MarketplaceListTitle />} />;
  }

  if (segments.length === 2 && segments[0] === "c") {
    const category = slugToCategory(segments[1]);

    if (category) {
      return <ListPage title={<MarketplaceListTitle category={category} />} />;
    }
  }

  if (segments.length === 1) {
    return <MarketplaceProgramPage programSlug={segments[0]} />;
  }

  notFound();
}

function ListPage({ title }: { title: ReactNode }) {
  return (
    <PageContent title={title}>
      <PageWidthWrapper className="pb-10">
        <MarketplaceProgramsListPage />
      </PageWidthWrapper>
    </PageContent>
  );
}
