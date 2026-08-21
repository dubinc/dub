import { Category } from "@prisma/client";
import { MarketplaceRewardType } from "./constants";

const MARKETPLACE_BASE = "/marketplace";

export const MARKETPLACE_RESERVED_SLUGS = new Set(["all", "c"]);

export function slugToCategory(slug: string): Category | null {
  const normalizedSlug = slug.toLowerCase();

  return (
    (Object.values(Category) as Category[]).find(
      (category) => category.toLowerCase() === normalizedSlug,
    ) ?? null
  );
}

function buildMarketplaceHref(
  path: string,
  params?: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });
  }

  const queryString = searchParams.toString();

  return `${path}${queryString ? `?${queryString}` : ""}`;
}

export function getMarketplaceHref() {
  return MARKETPLACE_BASE;
}

export function getMarketplaceAllHref(
  params?: Record<string, string | undefined>,
) {
  return buildMarketplaceHref(`${MARKETPLACE_BASE}/all`, params);
}

export function getPreservedMarketplaceSearchParams(
  searchParamsObj: Record<string, string | string[] | undefined>,
) {
  const { rewardType, search, sortBy, sortOrder } = searchParamsObj;

  return {
    rewardType: typeof rewardType === "string" ? rewardType : undefined,
    search: typeof search === "string" ? search : undefined,
    sortBy: typeof sortBy === "string" ? sortBy : undefined,
    sortOrder: typeof sortOrder === "string" ? sortOrder : undefined,
  };
}

export function getMarketplaceCategoryHref(
  category: Category,
  params?: Record<string, string | undefined>,
) {
  return buildMarketplaceHref(
    `${MARKETPLACE_BASE}/c/${category.toLowerCase()}`,
    params,
  );
}

export function getMarketplaceProgramHref(programSlug: string) {
  return `${MARKETPLACE_BASE}/${programSlug}`;
}

export function getMarketplacePathFromSlug(slug?: string[]) {
  const segments = slug ?? [];

  if (segments.length === 0) {
    return MARKETPLACE_BASE;
  }

  return `${MARKETPLACE_BASE}/${segments.join("/")}`;
}

export function getMarketplaceCanonicalUrl(pathname: string) {
  return `https://dub.co${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function getMarketplacePartnersProgramUrl(programSlug: string) {
  return `https://partners.dub.co${getMarketplaceProgramHref(programSlug)}`;
}

export function getMarketplacePublicApplyHref(programSlug: string) {
  return getMarketplacePartnersProgramUrl(programSlug);
}

export function getMarketplaceCategoryFromPathname(
  pathname: string,
): Category | null {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 3 &&
    segments[0] === "marketplace" &&
    segments[1] === "c"
  ) {
    return slugToCategory(segments[2]);
  }

  return null;
}

export function isMarketplaceFilterSidebarPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "marketplace") {
    return false;
  }

  if (segments.length === 1) {
    return false;
  }

  if (segments[1] === "all") {
    return true;
  }

  if (
    segments.length === 3 &&
    segments[1] === "c" &&
    slugToCategory(segments[2])
  ) {
    return true;
  }

  return false;
}

export function buildExternalMarketplaceFilterHref({
  basePath,
  activeRewardType,
  search,
  sortBy,
  sortOrder,
  category,
  rewardType,
}: {
  basePath: string;
  activeRewardType?: MarketplaceRewardType;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  category?: Category | null;
  rewardType?: MarketplaceRewardType | null;
}) {
  const resolvedRewardType =
    rewardType === undefined ? activeRewardType : rewardType || undefined;

  const queryParams = {
    rewardType: resolvedRewardType,
    search,
    sortBy,
    sortOrder,
  };

  if (category === null) {
    return getMarketplaceAllHref(queryParams);
  }

  if (category) {
    return getMarketplaceCategoryHref(category, queryParams);
  }

  const query = new URLSearchParams();
  if (resolvedRewardType) query.set("rewardType", resolvedRewardType);
  if (search) query.set("search", search);
  if (sortBy && sortBy !== "popularity") query.set("sortBy", sortBy);
  if (sortOrder && sortOrder !== "desc") query.set("sortOrder", sortOrder);
  const queryString = query.toString();

  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}
