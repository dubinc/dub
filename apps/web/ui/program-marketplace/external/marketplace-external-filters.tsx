import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import {
  MARKETPLACE_REWARD_TYPES,
  type MarketplaceRewardType,
} from "@/ui/program-marketplace/constants";
import { buildExternalMarketplaceFilterHref } from "@/ui/program-marketplace/utils/urls";
import { Category } from "@dub/prisma/client";
import { Check } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import type { ReactNode } from "react";

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
  activeRewardType?: MarketplaceRewardType;
  categoryCounts: { category: Category; count: number }[];
  rewardTypeCounts: {
    type: MarketplaceRewardType;
    count: number;
  }[];
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const buildHref = (params: {
    category?: Category | null;
    rewardType?: MarketplaceRewardType | null;
  }) =>
    buildExternalMarketplaceFilterHref({
      basePath,
      activeRewardType,
      search,
      sortBy,
      sortOrder,
      ...params,
    });

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
              {MARKETPLACE_REWARD_TYPES[type]}
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

export function MarketplaceExternalFilterSidebarSkeleton() {
  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="flex flex-col gap-6">
        {[4, 6].map((rows, sectionIndex) => (
          <div key={sectionIndex} className="flex flex-col gap-1">
            <div className="px-2 py-2">
              <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
            </div>
            <div className="flex flex-col gap-1">
              {[...Array(rows)].map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-2 py-2"
                  aria-hidden
                >
                  <div className="size-4 shrink-0 animate-pulse rounded border border-neutral-200 bg-neutral-200" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-neutral-200" />
                  <div className="h-3 w-4 shrink-0 animate-pulse rounded bg-neutral-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
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
