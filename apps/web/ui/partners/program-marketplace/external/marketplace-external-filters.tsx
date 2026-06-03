import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { Category } from "@dub/prisma/client";
import { Check } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import type { ReactNode } from "react";

const REWARD_TYPES = {
  sale: "Sale reward (CPS)",
  lead: "Lead reward (CPL)",
  click: "Click reward (CPC)",
  discount: "Dual-sided incentives",
} as const;

export function MarketplaceExternalFilterSidebar({
  basePath,
  activeCategory,
  activeRewardType,
  categoryCounts,
  rewardTypeCounts,
  search,
  sortBy,
  sortOrder,
}: {
  basePath: string;
  activeCategory?: Category;
  activeRewardType?: keyof typeof REWARD_TYPES;
  categoryCounts: { category: Category; count: number }[];
  rewardTypeCounts: {
    type: keyof typeof REWARD_TYPES;
    count: number;
  }[];
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const buildHref = (params: {
    category?: Category | null;
    rewardType?: keyof typeof REWARD_TYPES | null;
  }) => {
    const rewardType =
      params.rewardType === undefined
        ? activeRewardType
        : params.rewardType || undefined;

    const query = new URLSearchParams();
    if (rewardType) query.set("rewardType", rewardType);
    if (search) query.set("search", search);
    if (sortBy && sortBy !== "popularity") query.set("sortBy", sortBy);
    if (sortOrder && sortOrder !== "desc") query.set("sortOrder", sortOrder);
    const queryString = query.toString();

    if (params.category === null) {
      return getMarketplaceAllHref({
        rewardType,
        search,
        sortBy,
        sortOrder,
      });
    }

    if (params.category) {
      return getMarketplaceCategoryHref(params.category, {
        rewardType,
        search,
        sortBy,
        sortOrder,
      });
    }

    if (basePath.endsWith("/all")) {
      return `${basePath}${queryString ? `?${queryString}` : ""}`;
    }

    return `${basePath}${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="flex flex-col gap-6">
        <FilterSection title="Reward type">
          {rewardTypeCounts.map(({ type, count }) => (
            <FilterLink
              key={type}
              href={buildHref({
                rewardType: activeRewardType === type ? null : type,
              })}
              active={activeRewardType === type}
              count={count}
            >
              {REWARD_TYPES[type]}
            </FilterLink>
          ))}
        </FilterSection>

        <FilterSection title="Category">
          {categoryCounts.map(({ category, count }) => (
            <FilterLink
              key={category}
              href={buildHref({
                category: activeCategory === category ? null : category,
              })}
              active={activeCategory === category}
              count={count}
            >
              {PROGRAM_CATEGORIES_MAP[category]?.label ??
                category.replaceAll("_", " ")}
            </FilterLink>
          ))}
        </FilterSection>
      </div>
    </aside>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-content-emphasis px-2 py-2 text-sm font-semibold">
        {title}
      </span>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100",
        active && "bg-neutral-100",
      )}
    >
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          active ? "border-neutral-900 bg-neutral-900" : "border-neutral-300",
        )}
      >
        {active ? <Check className="h-3 w-3 text-white" /> : null}
      </div>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <span className="shrink-0 text-xs tabular-nums text-neutral-400">
        {count}
      </span>
    </Link>
  );
}

export function getMarketplaceExternalBasePath({ slug }: { slug?: string[] }) {
  const segments = slug ?? [];

  if (segments.length === 1 && segments[0] === "all") {
    return "/marketplace/all";
  }

  if (segments.length === 2 && segments[0] === "c") {
    return `/marketplace/c/${segments[1]}`;
  }

  return "/marketplace/all";
}
