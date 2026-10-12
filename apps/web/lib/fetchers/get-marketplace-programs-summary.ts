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

type ProgramMeta = {
  program: ProgramRecord;
  categories: Category[];
};

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

function byCategoryLabel(a: Category, b: Category) {
  const labelA = PROGRAM_CATEGORIES_MAP[a]?.label ?? a;
  const labelB = PROGRAM_CATEGORIES_MAP[b]?.label ?? b;
  return labelA.localeCompare(labelB);
}

function toProgramMeta(program: ProgramRecord): ProgramMeta {
  return {
    program,
    categories: program.categories
      .map(({ category }) => category)
      .sort(byCategoryLabel),
  };
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
  usedIds: Set<string>,
  limit: number,
  sortFn: (a: ProgramRecord, b: ProgramRecord) => number,
) {
  const selected: ProgramRecord[] = [];

  for (const program of [...candidates].sort(sortFn)) {
    if (usedIds.has(program.id)) {
      continue;
    }

    selected.push(program);
    usedIds.add(program.id);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function selectCategoryRows(programMeta: ProgramMeta[], usedIds: Set<string>) {
  const rows = new Map<Category, ProgramRecord[]>(
    MARKETPLACE_HOME_CATEGORIES.map((category) => [category, []]),
  );

  // Best-ranked programs claim a slot first. A program uses its first category
  // when that row still has room, then falls through to later categories.
  const ranked = [...programMeta].sort((a, b) =>
    byMarketplaceRanking(a.program, b.program),
  );

  for (const { program, categories } of ranked) {
    if (usedIds.has(program.id)) {
      continue;
    }

    for (const category of categories) {
      const row = rows.get(category);

      if (!row || row.length >= MARKETPLACE_HOME_ROW_PAGE_SIZE) {
        continue;
      }

      row.push(program);
      usedIds.add(program.id);
      break;
    }
  }

  return rows;
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

  const programMeta = programs.map(toProgramMeta);
  const usedIds = new Set<string>();

  const selectRow = (
    candidates: ProgramRecord[],
    sortFn: (a: ProgramRecord, b: ProgramRecord) => number,
  ) =>
    selectPrograms(
      candidates,
      usedIds,
      MARKETPLACE_HOME_ROW_PAGE_SIZE,
      sortFn,
    ).map(formatNetworkProgram);

  const featuredPrograms = programs
    .filter((program) => program.featuredOnMarketplaceAt)
    .sort(() => Math.random() - 0.5)
    .map(formatNetworkProgram);

  const mostPopular = selectRow(programs, byMarketplaceRanking);
  const newPrograms = selectPrograms(
    programs,
    new Set(),
    MARKETPLACE_HOME_ROW_PAGE_SIZE,
    byRecency,
  ).map(formatNetworkProgram);
  const categoryRows = selectCategoryRows(programMeta, usedIds);

  const categories = Object.fromEntries(
    Object.values(Category).map((category) => [
      category,
      (categoryRows.get(category) ?? []).map(formatNetworkProgram),
    ]),
  );

  return MarketplaceProgramsSummarySchema.parse({
    featuredPrograms,
    mostPopular,
    newPrograms,
    categories,
  });
});
