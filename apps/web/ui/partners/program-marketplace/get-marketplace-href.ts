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

export function getMarketplacePopularHref(
  params?: Record<string, string | undefined>,
) {
  return buildMarketplaceHref(`${MARKETPLACE_BASE}/popular`, params);
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
