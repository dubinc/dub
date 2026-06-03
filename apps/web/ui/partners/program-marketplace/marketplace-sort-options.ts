import {
  Calendar6,
  SortAlphaAscending,
  SortAlphaDescending,
  Star,
} from "@dub/ui/icons";

export const MARKETPLACE_SORT_OPTIONS = [
  {
    icon: Star,
    label: "Most popular",
    value: "popularity",
    order: "desc",
  },
  {
    icon: Calendar6,
    label: "Newest",
    value: "recency",
    order: "desc",
  },
  {
    icon: SortAlphaDescending,
    label: "Name A-Z",
    value: "name",
    order: "asc",
  },
  {
    icon: SortAlphaAscending,
    label: "Name Z-A",
    value: "name",
    order: "desc",
  },
] as const;

export function isDefaultMarketplaceSort(sortBy: string, sortOrder: string) {
  return sortBy === "popularity" && sortOrder === "desc";
}

export function getMarketplaceToolbarBadgeCount(
  activeFilterCount: number,
  sortBy: string,
  sortOrder: string,
) {
  return (
    activeFilterCount + (isDefaultMarketplaceSort(sortBy, sortOrder) ? 0 : 1)
  );
}
