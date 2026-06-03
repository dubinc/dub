import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { notFound } from "next/navigation";
import { MarketplaceListPageTitle } from "./marketplace-list-page-title";
import {
  MarketplaceVariantProvider,
  type MarketplaceVariant,
} from "./marketplace-variant-context";
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
        <PageContent title={<MarketplaceListPageTitle />}>
          <PageWidthWrapper className="pb-10">
            <MarketplaceProgramsListPage />
          </PageWidthWrapper>
        </PageContent>
      );
    }

    if (segments.length === 2 && segments[0] === "c") {
      const category = slugToCategory(segments[1]);

      if (category) {
        return (
          <PageContent title={<MarketplaceListPageTitle />}>
            <PageWidthWrapper className="pb-10">
              <MarketplaceProgramsListPage />
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
