import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { Category } from "@dub/prisma/client";
import { CircleInfo } from "@dub/ui";
import Link from "next/link";

const MARKETPLACE_HOME_CATEGORIES = [
  Category.Productivity,
  Category.Artificial_Intelligence,
  Category.Marketing,
  Category.Development,
  Category.Design,
  Category.Finance,
  Category.Ecommerce,
  Category.Health,
  Category.Consumer,
  Category.Education,
] as const;

export function MarketplaceExternalCategories() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-content-emphasis text-base font-semibold">
          Categories
        </h2>
        <Link
          href={getMarketplaceAllHref()}
          className="text-content-subtle hover:text-content-emphasis text-sm font-medium transition-colors"
        >
          View all programs
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {MARKETPLACE_HOME_CATEGORIES.map((category) => {
          const { icon: Icon } = PROGRAM_CATEGORIES_MAP[category] ?? {
            icon: CircleInfo,
          };

          return (
            <Link
              key={category}
              href={getMarketplaceCategoryHref(category)}
              className="border-border-subtle hover:bg-bg-subtle flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition-colors"
            >
              <Icon className="text-content-muted size-4 shrink-0" />
              <span className="text-content-emphasis truncate text-sm font-medium">
                {PROGRAM_CATEGORIES_MAP[category]?.label ??
                  category.replaceAll("_", " ")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
