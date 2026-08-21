import {
  Calendar6,
  SortAlphaAscending,
  SortAlphaDescending,
  Star,
} from "@dub/ui/icons";

export const MARKETPLACE_REWARD_TYPES = {
  sale: "Sale reward (CPS)",
  lead: "Lead reward (CPL)",
  click: "Click reward (CPC)",
  discount: "Dual-sided incentives",
} as const;

export type MarketplaceRewardType = keyof typeof MARKETPLACE_REWARD_TYPES;

export const MARKETPLACE_ENROLLMENT_STATUSES = {
  null: "Not applied",
  approved: "Enrolled",
  deactivated: "Deactivated",
} as const;

export type MarketplaceEnrollmentStatus =
  keyof typeof MARKETPLACE_ENROLLMENT_STATUSES;

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
    icon: SortAlphaAscending,
    label: "Name A-Z",
    value: "name",
    order: "asc",
  },
  {
    icon: SortAlphaDescending,
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
