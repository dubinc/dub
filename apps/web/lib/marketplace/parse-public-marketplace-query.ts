import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { Category } from "@dub/prisma/client";

export const EXTERNAL_MARKETPLACE_PAGE_SIZE = 24;

function pickString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function toQueryInput(
  searchParams: Record<string, string | string[] | undefined>,
  fixedCategory?: Category,
) {
  return {
    rewardType: pickString(searchParams.rewardType),
    search: pickString(searchParams.search),
    sortBy: pickString(searchParams.sortBy),
    sortOrder: pickString(searchParams.sortOrder),
    page: pickString(searchParams.page),
    pageSize: EXTERNAL_MARKETPLACE_PAGE_SIZE,
    category: fixedCategory ?? pickString(searchParams.category),
  };
}

export function isValidPublicMarketplaceQuery(
  searchParams: Record<string, string | string[] | undefined> = {},
  fixedCategory?: Category,
) {
  return getPublicNetworkProgramsQuerySchema.safeParse(
    toQueryInput(searchParams, fixedCategory),
  ).success;
}

export function parsePublicMarketplaceQuery(
  searchParams: Record<string, string | string[] | undefined> = {},
  fixedCategory?: Category,
) {
  const parsed = getPublicNetworkProgramsQuerySchema.safeParse(
    toQueryInput(searchParams, fixedCategory),
  );

  if (parsed.success) {
    return parsed.data;
  }

  return getPublicNetworkProgramsQuerySchema.parse({
    pageSize: EXTERNAL_MARKETPLACE_PAGE_SIZE,
    ...(fixedCategory ? { category: fixedCategory } : {}),
  });
}
