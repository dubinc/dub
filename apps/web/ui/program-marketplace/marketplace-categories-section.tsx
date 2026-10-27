import { MARKETPLACE_HOME_CATEGORIES } from "@/lib/marketplace/home-sections";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "@/ui/program-marketplace/utils/urls";
import { CircleInfo } from "@dub/ui";
import Link from "next/link";

export function MarketplaceCategoriesSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-content-emphasis text-[18px] font-semibold">
          Categories
        </h2>
        <Link
          href={getMarketplaceAllHref()}
          className="text-content-emphasis text-sm font-medium transition-colors hover:text-neutral-500"
        >
          View all programs
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {MARKETPLACE_HOME_CATEGORIES.map((category) => {
          const { icon: Icon, label } = PROGRAM_CATEGORIES_MAP[category] ?? {
            icon: CircleInfo,
            label: category.replaceAll("_", " "),
          };

          return (
            <Link
              key={category}
              href={getMarketplaceCategoryHref(category)}
              className="border-border-subtle hover:bg-bg-subtle flex flex-col gap-2 rounded-xl border bg-white p-3 transition-colors"
            >
              <Icon className="size-[18px] shrink-0 text-neutral-600" />
              <span className="truncate text-sm font-semibold text-neutral-900">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
