import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { Category } from "@dub/prisma/client";

export const EXTERNAL_MARKETPLACE_PAGE_SIZE = 24;

function pickString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function parsePublicMarketplaceQuery(
  searchParams: Record<string, string | string[] | undefined> = {},
  fixedCategory?: Category,
) {
  const input = {
    category: fixedCategory ?? pickString(searchParams.category),
    rewardType: pickString(searchParams.rewardType),
    search: pickString(searchParams.search),
    sortBy: pickString(searchParams.sortBy),
    sortOrder: pickString(searchParams.sortOrder),
    page: pickString(searchParams.page),
    pageSize: EXTERNAL_MARKETPLACE_PAGE_SIZE,
  };

  const parsed = getPublicNetworkProgramsQuerySchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  return getPublicNetworkProgramsQuerySchema.parse({
    pageSize: EXTERNAL_MARKETPLACE_PAGE_SIZE,
    ...(fixedCategory ? { category: fixedCategory } : {}),
  });
}
