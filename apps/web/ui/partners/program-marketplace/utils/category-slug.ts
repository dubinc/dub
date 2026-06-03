import { Category } from "@dub/prisma/client";

export const MARKETPLACE_RESERVED_SLUGS = new Set(["all", "popular", "c"]);

export function categoryToSlug(category: Category): string {
  return category.toLowerCase().replaceAll("_", "-");
}

export function slugToCategory(slug: string): Category | null {
  if (MARKETPLACE_RESERVED_SLUGS.has(slug)) {
    return null;
  }

  const normalizedSlug = slug.toLowerCase();

  return (
    (Object.values(Category) as Category[]).find(
      (category) => categoryToSlug(category) === normalizedSlug,
    ) ?? null
  );
}

export function getMarketplaceCategoryFromPathname(
  pathname: string,
): Category | null {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments[0] === "marketplace" &&
    segments.length === 3 &&
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
