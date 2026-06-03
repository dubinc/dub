import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { Category } from "@dub/prisma/client";

const REWARD_TYPES = ["sale", "lead", "click", "discount"] as const;

export type ExternalMarketplaceRewardType = (typeof REWARD_TYPES)[number];

export function buildExternalMarketplaceFilterHref({
  basePath,
  activeCategory,
  activeRewardType,
  search,
  sortBy,
  sortOrder,
  category,
  rewardType,
}: {
  basePath: string;
  activeCategory?: Category;
  activeRewardType?: ExternalMarketplaceRewardType;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  category?: Category | null;
  rewardType?: ExternalMarketplaceRewardType | null;
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
