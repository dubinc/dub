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

const HOME_CATEGORY_SET = new Set<Category>(MARKETPLACE_HOME_CATEGORIES);

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
  primary: Category | null;
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

function getPrimaryCategory(categories: Category[]) {
  return [...categories].sort((a, b) => {
    const labelA = PROGRAM_CATEGORIES_MAP[a]?.label ?? a;
    const labelB = PROGRAM_CATEGORIES_MAP[b]?.label ?? b;
    return labelA.localeCompare(labelB);
  })[0];
}

function toProgramMeta(program: ProgramRecord): ProgramMeta {
  const categories = program.categories.map(({ category }) => category);
  return {
    program,
    categories,
    primary: categories.length > 0 ? getPrimaryCategory(categories) : null,
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
  const rows = new Map<Category, ProgramRecord[]>();

  for (const category of MARKETPLACE_HOME_CATEGORIES) {
    rows.set(
      category,
      selectPrograms(
        programMeta
          .filter((meta) => meta.primary === category)
          .map((meta) => meta.program),
        usedIds,
        MARKETPLACE_HOME_ROW_PAGE_SIZE,
        byMarketplaceRanking,
      ),
    );
  }

  const missedPrimary = new Set(
    programMeta
      .filter(
        (meta) =>
          meta.primary &&
          HOME_CATEGORY_SET.has(meta.primary) &&
          !usedIds.has(meta.program.id),
      )
      .map((meta) => meta.program.id),
  );

  for (const category of MARKETPLACE_HOME_CATEGORIES) {
    const current = rows.get(category)!;
    const remaining = MARKETPLACE_HOME_ROW_PAGE_SIZE - current.length;

    if (remaining === 0) {
      continue;
    }

    const additional = selectPrograms(
      programMeta
        .filter(
          (meta) =>
            missedPrimary.has(meta.program.id) &&
            meta.categories.includes(category) &&
            meta.primary !== category,
        )
        .map((meta) => meta.program),
      usedIds,
      remaining,
      byMarketplaceRanking,
    );

    rows.set(category, [...current, ...additional]);

    for (const program of additional) {
      missedPrimary.delete(program.id);
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
  const newPrograms = selectRow(programs, byRecency);
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
