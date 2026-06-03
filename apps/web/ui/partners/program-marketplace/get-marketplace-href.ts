import { Category } from "@dub/prisma/client";
import { categoryToSlug } from "./utils/category-slug";

const MARKETPLACE_BASE = "/marketplace";

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

/** @deprecated Use {@link getMarketplaceAllHref} — popular routes redirect to /all. */
export function getMarketplacePopularHref(
  params?: Record<string, string | undefined>,
) {
  return getMarketplaceAllHref(params);
}

function parseMarketplaceSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return typeof value === "string" ? value : undefined;
}

/** Redirect target for legacy `/marketplace/popular` URLs. */
export function getMarketplacePopularRedirectHref(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  const rewardType = parseMarketplaceSearchParam(searchParams, "rewardType");
  const search = parseMarketplaceSearchParam(searchParams, "search");
  const sortBy = parseMarketplaceSearchParam(searchParams, "sortBy");
  const sortOrder = parseMarketplaceSearchParam(searchParams, "sortOrder");

  if (!sortBy || sortBy === "popularity") {
    return getMarketplaceAllHref({
      rewardType,
      search,
      sortBy: "popularity",
      sortOrder: sortOrder ?? "desc",
    });
  }

  return getMarketplaceAllHref({
    rewardType,
    search,
    sortBy,
    sortOrder:
      sortOrder ??
      (sortBy === "recency" || sortBy === "popularity" ? "desc" : undefined),
  });
}

export function getMarketplaceCategoryHref(
  category: Category,
  params?: Record<string, string | undefined>,
) {
  return buildMarketplaceHref(
    `${MARKETPLACE_BASE}/c/${categoryToSlug(category)}`,
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

export function getMarketplacePartnersProgramUrl(programSlug: string) {
  return `https://partners.dub.co${getMarketplaceProgramHref(programSlug)}`;
}
