import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { notFound } from "next/navigation";
import { MarketplacePageTitle } from "./marketplace-page-title";
import {
  MarketplaceVariantProvider,
  type MarketplaceVariant,
} from "./marketplace-variant-context";
import { MarketplaceCategoryProgramsPage } from "./pages/marketplace-category-programs-page";
import { MarketplaceHomePage } from "./pages/marketplace-home-page";
import { MarketplaceProgramPage } from "./pages/marketplace-program-page";
import { MarketplaceProgramsListPage } from "./pages/marketplace-programs-list-page";
import { slugToCategory } from "./utils/category-slug";

export function MarketplaceRouter({
  slug,
  variant = "internal",
}: {
  slug?: string[];
  variant?: MarketplaceVariant;
}) {
  const segments = slug ?? [];

  const content = (() => {
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
      return (
        <PageContent title={<MarketplacePageTitle title="All Programs" />}>
          <PageWidthWrapper className="pb-10">
            <MarketplaceProgramsListPage />
          </PageWidthWrapper>
        </PageContent>
      );
    }

    if (segments.length === 2 && segments[0] === "c") {
      const category = slugToCategory(segments[1]);

      if (category) {
        const categoryLabel =
          PROGRAM_CATEGORIES_MAP[category]?.label ??
          category.replaceAll("_", " ");

        return (
          <PageContent title={<MarketplacePageTitle title={categoryLabel} />}>
            <PageWidthWrapper className="pb-10">
              <MarketplaceCategoryProgramsPage category={category} />
            </PageWidthWrapper>
          </PageContent>
        );
      }
    }

    if (segments.length === 1) {
      return <MarketplaceProgramPage programSlug={segments[0]} />;
    }

    notFound();
  })();

  return (
    <MarketplaceVariantProvider variant={variant}>
      {content}
    </MarketplaceVariantProvider>
  );
}
