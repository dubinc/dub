import { notFound } from "next/navigation";
import { slugToCategory } from "../utils/category-slug";
import { MarketplaceExternalHomePage } from "./marketplace-external-home-page";
import { MarketplaceExternalListPage } from "./marketplace-external-list-page";
import { MarketplaceExternalPopularPage } from "./marketplace-external-popular-page";
import { MarketplaceExternalProgramPage } from "./marketplace-external-program-page";

export async function MarketplaceExternalRouter({
  slug,
  searchParams,
}: {
  slug?: string[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const segments = slug ?? [];

  if (segments.length === 0) {
    return <MarketplaceExternalHomePage />;
  }

  if (segments.length === 1 && segments[0] === "all") {
    return (
      <MarketplaceExternalListPage slug={slug} searchParams={searchParams} />
    );
  }

  if (segments.length === 1 && segments[0] === "popular") {
    return (
      <MarketplaceExternalPopularPage
        slug={slug}
        searchParams={searchParams}
      />
    );
  }

  if (segments.length === 2 && segments[0] === "p") {
    return <MarketplaceExternalProgramPage programSlug={segments[1]} />;
  }

  if (segments.length === 1) {
    const category = slugToCategory(segments[0]);

    if (category) {
      return (
        <MarketplaceExternalListPage
          slug={slug}
          searchParams={searchParams}
          fixedCategory={category}
        />
      );
    }
  }

  notFound();
}
