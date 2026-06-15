import { notFound } from "next/navigation";
import { slugToCategory } from "../utils/urls";
import { MarketplaceExternalHomePage } from "./marketplace-external-home-page";
import { MarketplaceExternalListPage } from "./marketplace-external-list-page";
import { MarketplaceExternalProgramPage } from "./marketplace-external-program-page";

export async function MarketplaceExternalRouter({ slug }: { slug?: string[] }) {
  const segments = slug ?? [];

  if (segments.length === 0) {
    return <MarketplaceExternalHomePage />;
  }

  if (segments.length === 1 && segments[0] === "all") {
    return <MarketplaceExternalListPage slug={slug} />;
  }

  if (segments.length === 2 && segments[0] === "c") {
    const category = slugToCategory(segments[1]);

    if (category) {
      return (
        <MarketplaceExternalListPage slug={slug} fixedCategory={category} />
      );
    }
  }

  if (segments.length === 1) {
    return <MarketplaceExternalProgramPage programSlug={segments[0]} />;
  }

  notFound();
}
