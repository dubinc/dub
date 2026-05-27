import { Category } from "@dub/prisma/client";

export const MARKETPLACE_RESERVED_SLUGS = new Set(["all", "popular", "p"]);

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

  if (segments.length === 2 && slugToCategory(segments[1])) {
    return true;
  }

  return false;
}
