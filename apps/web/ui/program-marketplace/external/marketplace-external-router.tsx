import { notFound } from "next/navigation";
import { slugToCategory } from "../utils/urls";
import { MarketplaceExternalHomePage } from "./marketplace-external-home-page";
import { MarketplaceExternalListPage } from "./marketplace-external-list-page";
import { MarketplaceExternalProgramPage } from "./marketplace-external-program-page";

export async function MarketplaceExternalRouter({
  segments,
}: {
  segments: string[];
}) {
  if (segments.length === 0) {
    return <MarketplaceExternalHomePage />;
  }

  if (segments.length === 1 && segments[0] === "all") {
    return <MarketplaceExternalListPage segments={segments} />;
  }

  if (segments.length === 2 && segments[0] === "c") {
    const category = slugToCategory(segments[1]);

    if (category) {
      return (
        <MarketplaceExternalListPage
          segments={segments}
          fixedCategory={category}
        />
      );
    }
  }

  if (segments.length === 1) {
    return <MarketplaceExternalProgramPage programSlug={segments[0]} />;
  }

  notFound();
}
