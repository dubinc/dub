import "server-only";

import {
  MARKETPLACE_HOME_CATEGORIES,
  MARKETPLACE_HOME_ROW_PAGE_SIZE,
} from "@/lib/marketplace/home-sections";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  MarketplaceProgramsSummarySchema,
  NetworkProgramSchema,
} from "@/lib/zod/schemas/program-network";
import { Category, Prisma } from "@prisma/client";
import { cache } from "react";

const programInclude = {
  groups: {
    where: {
      slug: DEFAULT_PARTNER_GROUP.slug,
    },
    include: {
      clickReward: true,
      leadReward: true,
      saleReward: true,
      referralReward: true,
      discount: true,
    },
  },
  categories: true,
} satisfies Prisma.ProgramInclude;

type ProgramRecord = Prisma.ProgramGetPayload<{
  include: typeof programInclude;
}>;

function formatNetworkProgram(program: ProgramRecord) {
  return NetworkProgramSchema.parse({
    ...program,
    rewards:
      program.groups.length > 0
        ? [
            program.groups[0].clickReward,
            program.groups[0].leadReward,
            program.groups[0].saleReward,
          ].filter(Boolean)
        : [],
    discount: program.groups.length > 0 ? program.groups[0].discount : null,
    categories: program.categories.map(({ category }) => category),
  });
}

function getPrimaryCategory(categories: Category[]) {
  return [...categories].sort((a, b) => {
    const labelA = PROGRAM_CATEGORIES_MAP[a]?.label ?? a;
    const labelB = PROGRAM_CATEGORIES_MAP[b]?.label ?? b;
    return labelA.localeCompare(labelB);
  })[0];
}

function byMarketplaceRanking(
  a: { marketplaceRanking: number },
  b: { marketplaceRanking: number },
) {
  return a.marketplaceRanking - b.marketplaceRanking;
}

function byRecency(
  a: { addedToMarketplaceAt: Date | null },
  b: { addedToMarketplaceAt: Date | null },
) {
  return (
    (b.addedToMarketplaceAt?.getTime() ?? 0) -
    (a.addedToMarketplaceAt?.getTime() ?? 0)
  );
}

function selectPrograms(
  candidates: ProgramRecord[],
  excludeIds: Set<string>,
  limit: number,
  sortFn: (a: ProgramRecord, b: ProgramRecord) => number,
) {
  const selected: ProgramRecord[] = [];

  for (const program of [...candidates].sort(sortFn)) {
    if (excludeIds.has(program.id)) {
      continue;
    }

    selected.push(program);
    excludeIds.add(program.id);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

export const getMarketplaceProgramsSummary = cache(async () => {
  const programs = await prisma.program.findMany({
    where: {
      addedToMarketplaceAt: {
        not: null,
      },
    },
    include: programInclude,
  });

  const featuredPrograms = programs
    .filter((program) => program.featuredOnMarketplaceAt)
    .sort(() => Math.random() - 0.5)
    .map(formatNetworkProgram);

  const usedProgramIds = new Set<string>();

  const mostPopular = selectPrograms(
    programs,
    usedProgramIds,
    MARKETPLACE_HOME_ROW_PAGE_SIZE,
    byMarketplaceRanking,
  ).map(formatNetworkProgram);

  const newPrograms = selectPrograms(
    programs,
    usedProgramIds,
    MARKETPLACE_HOME_ROW_PAGE_SIZE,
    byRecency,
  ).map(formatNetworkProgram);

  const homeCategorySet = new Set<Category>(MARKETPLACE_HOME_CATEGORIES);
  const categoryBuckets = new Map<Category, ProgramRecord[]>();

  for (const program of programs) {
    const categories = program.categories.map(({ category }) => category);

    if (categories.length === 0) {
      continue;
    }

    const primaryCategory = getPrimaryCategory(categories);

    if (!homeCategorySet.has(primaryCategory)) {
      continue;
    }

    const bucket = categoryBuckets.get(primaryCategory) ?? [];
    bucket.push(program);
    categoryBuckets.set(primaryCategory, bucket);
  }

  const categories = Object.fromEntries(
    Object.values(Category).map((category) => [
      category,
      homeCategorySet.has(category)
        ? selectPrograms(
            categoryBuckets.get(category) ?? [],
            usedProgramIds,
            MARKETPLACE_HOME_ROW_PAGE_SIZE,
            byMarketplaceRanking,
          ).map(formatNetworkProgram)
        : [],
    ]),
  );

  return MarketplaceProgramsSummarySchema.parse({
    featuredPrograms,
    mostPopular,
    newPrograms,
    categories,
  });
});
