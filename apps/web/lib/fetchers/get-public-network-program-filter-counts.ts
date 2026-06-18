import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { Category, Prisma } from "@dub/prisma/client";
import { cache } from "react";
import * as z from "zod/v4";

const rewardTypeMap = {
  sale: Prisma.sql`pg.saleRewardId IS NOT NULL`,
  lead: Prisma.sql`pg.leadRewardId IS NOT NULL`,
  click: Prisma.sql`pg.clickRewardId IS NOT NULL`,
  discount: Prisma.sql`pg.discountId IS NOT NULL`,
};

export const getPublicNetworkProgramFilterCounts = cache(
  async ({
    category,
    rewardType,
  }: Pick<
    z.input<typeof getPublicNetworkProgramsQuerySchema>,
    "category" | "rewardType"
  > = {}) => {
    const [categories, rewardTypes] = await Promise.all([
      getCategoryCounts(rewardType),
      getRewardTypeCounts(category),
    ]);

    return {
      categories,
      rewardTypes,
    };
  },
);

async function getCategoryCounts(
  rewardType?: z.infer<
    typeof getPublicNetworkProgramsQuerySchema
  >["rewardType"],
) {
  const commonWhereSql = buildCommonWhereSql({ rewardType });

  const categories = (await prisma.$queryRaw`
    SELECT pc.category, COUNT(p.id) AS _count
    FROM ProgramCategory pc
    JOIN Program p ON p.id = pc.programId
    WHERE ${commonWhereSql}
    GROUP BY pc.category
    ORDER BY _count DESC
  `) as { category: Category; _count: bigint }[];

  return categories.map(({ category, _count }) => ({
    category,
    count: Number(_count),
  }));
}

async function getRewardTypeCounts(category?: Category) {
  const commonWhereSql = buildCommonWhereSql({ category });

  const rewards = (await prisma.$queryRaw`
    SELECT
      COUNT(pg.clickRewardId) AS "click",
      COUNT(pg.leadRewardId) AS "lead",
      COUNT(pg.saleRewardId) AS "sale",
      COUNT(pg.discountId) AS "discount"
    FROM PartnerGroup pg
    JOIN Program p ON p.id = pg.programId
    WHERE pg.slug = ${DEFAULT_PARTNER_GROUP.slug} AND ${commonWhereSql}
  `) as { click: bigint; lead: bigint; sale: bigint; discount: bigint }[];

  return (["sale", "lead", "click", "discount"] as const).map((type) => ({
    type,
    count: Number(rewards[0][type]),
  }));
}

function buildCommonWhereSql({
  category,
  rewardType,
}: {
  category?: Category;
  rewardType?: z.infer<
    typeof getPublicNetworkProgramsQuerySchema
  >["rewardType"];
}) {
  return Prisma.sql`
    p.addedToMarketplaceAt IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM PartnerGroup pg
      WHERE
        pg.programId = p.id
        AND pg.slug = ${DEFAULT_PARTNER_GROUP.slug}
        AND pg.applicationFormPublishedAt IS NOT NULL
        ${
          rewardType
            ? Prisma.sql`AND ${rewardTypeMap[rewardType]}`
            : Prisma.sql``
        }
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
  `;
}
