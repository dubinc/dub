import { Category } from "@dub/prisma/client";
import { MarketplaceProgramsListPage } from "./marketplace-programs-list-page";

export function MarketplaceCategoryProgramsPage({
  category,
}: {
  category: Category;
}) {
  return <MarketplaceProgramsListPage fixedCategory={category} />;
}
