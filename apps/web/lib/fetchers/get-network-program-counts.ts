import { prisma } from "@/lib/prisma";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { Category, Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { cache } from "react";
import * as z from "zod/v4";

type RewardType = NonNullable<
  z.infer<typeof getPublicNetworkProgramsQuerySchema>["rewardType"]
>;

const rewardTypeMap: Record<RewardType, Prisma.Sql> = {
  sale: Prisma.sql`pg.saleRewardId IS NOT NULL`,
  lead: Prisma.sql`pg.leadRewardId IS NOT NULL`,
  click: Prisma.sql`pg.clickRewardId IS NOT NULL`,
  discount: Prisma.sql`pg.discountId IS NOT NULL`,
};

type NetworkProgramWhereParams = {
  category?: Category;
  rewardType?: RewardType;
  search?: string;
  // partner-scoped (network) filters only
  status?: ProgramEnrollmentStatus | null;
  partnerId?: string;
  featured?: boolean;
};

export function buildNetworkProgramCountWhereSql({
  category,
  rewardType,
  search,
  status,
  partnerId,
  featured,
}: NetworkProgramWhereParams) {
  const searchSql = search ? Prisma.sql`CONCAT('%', ${search}, '%')` : null;

  return Prisma.sql`
    p.addedToMarketplaceAt IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM PartnerGroup pg
      WHERE
        pg.programId = p.id
        AND pg.slug = ${DEFAULT_PARTNER_GROUP.slug}
        AND pg.applicationFormPublishedAt IS NOT NULL
        ${rewardType ? Prisma.sql`AND ${rewardTypeMap[rewardType]}` : Prisma.sql``}
    )
    ${
      category
        ? Prisma.sql`
          AND EXISTS (
            SELECT 1 FROM ProgramCategory pc
            WHERE pc.programId = p.id AND pc.category = ${category}
          )`
        : Prisma.sql``
    }
    ${
      status !== undefined && partnerId
        ? Prisma.sql`
          AND ${status === null ? Prisma.sql`NOT` : Prisma.sql``} EXISTS (
            SELECT 1 FROM ProgramEnrollment pe
            WHERE
              pe.programId = p.id
              AND pe.partnerId = ${partnerId}
              ${status === null ? Prisma.sql`` : Prisma.sql`AND pe.status = ${status}`}
          )`
        : Prisma.sql``
    }
    ${
      featured !== undefined
        ? Prisma.sql`AND p.featuredOnMarketplaceAt IS ${featured ? Prisma.sql`NOT` : Prisma.sql``} NULL`
        : Prisma.sql``
    }
    ${
      searchSql
        ? Prisma.sql`AND (p.name LIKE ${searchSql} OR p.slug LIKE ${searchSql} OR p.domain LIKE ${searchSql} OR p.url LIKE ${searchSql} OR p.description LIKE ${searchSql})`
        : Prisma.sql``
    }
  `;
}

export async function getNetworkProgramTotalCount(
  params: NetworkProgramWhereParams = {},
) {
  const whereSql = buildNetworkProgramCountWhereSql(params);

  const result = (await prisma.$queryRaw`
    SELECT COUNT(*) AS count FROM Program p
    WHERE ${whereSql}
  `) as { count: bigint }[];

  return Number(result[0].count);
}

export async function getNetworkProgramCategoryCounts(
  params: NetworkProgramWhereParams = {},
) {
  // category counts ignore the active category filter
  const whereSql = buildNetworkProgramCountWhereSql({
    ...params,
    category: undefined,
  });

  const categories = (await prisma.$queryRaw`
    SELECT pc.category, COUNT(p.id) AS _count
    FROM ProgramCategory pc
    JOIN Program p ON p.id = pc.programId
    WHERE ${whereSql}
    GROUP BY pc.category
    ORDER BY _count DESC
  `) as { category: Category; _count: bigint }[];

  return categories.map(({ category, _count }) => ({
    category,
    count: Number(_count),
  }));
}

export async function getNetworkProgramRewardTypeCounts(
  params: NetworkProgramWhereParams = {},
) {
  // reward type counts ignore the active reward type filter
  const whereSql = buildNetworkProgramCountWhereSql({
    ...params,
    rewardType: undefined,
  });

  const rewards = (await prisma.$queryRaw`
    SELECT
      COUNT(pg.clickRewardId) AS "click",
      COUNT(pg.leadRewardId) AS "lead",
      COUNT(pg.saleRewardId) AS "sale",
      COUNT(pg.discountId) AS "discount"
    FROM PartnerGroup pg
    JOIN Program p ON p.id = pg.programId
    WHERE pg.slug = ${DEFAULT_PARTNER_GROUP.slug} AND ${whereSql}
  `) as { click: bigint; lead: bigint; sale: bigint; discount: bigint }[];

  return (["sale", "lead", "click", "discount"] as const).map((type) => ({
    type,
    count: Number(rewards[0][type]),
  }));
}

/**
 * Public marketplace counts: total program count + per-category and
 * per-reward-type filter counts in a single call. Wrapped in React `cache()`
 * so it dedupes when invoked multiple times within one server render.
 */
export const getNetworkProgramCounts = cache(
  async ({
    category,
    rewardType,
    search,
  }: Pick<
    NetworkProgramWhereParams,
    "category" | "rewardType" | "search"
  > = {}) => {
    const [total, categories, rewardTypes] = await Promise.all([
      getNetworkProgramTotalCount({ category, rewardType, search }),
      getNetworkProgramCategoryCounts({ rewardType, search }),
      getNetworkProgramRewardTypeCounts({ category, search }),
    ]);

    return {
      total,
      categories,
      rewardTypes,
    };
  },
);

export type NetworkProgramCounts = Awaited<
  ReturnType<typeof getNetworkProgramCounts>
>;
