import { withPartnerProfile } from "@/lib/auth/partner";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { getNetworkProgramsCountQuerySchema } from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

const rewardTypeMap = {
  sale: Prisma.sql`pg.saleRewardId IS NOT NULL`,
  lead: Prisma.sql`pg.leadRewardId IS NOT NULL`,
  click: Prisma.sql`pg.clickRewardId IS NOT NULL`,
  discount: Prisma.sql`pg.discountId IS NOT NULL`,
};

// GET /api/network/programs/count - get the number of available programs in the network
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { groupBy, category, rewardType, search } =
    getNetworkProgramsCountQuerySchema.parse(searchParams);

  const searchSql = search ? Prisma.sql`CONCAT('%', ${search}, '%')` : null;
  const commonWhereSql = Prisma.sql`
    p.marketplaceEnabledAt IS NOT NULL
    ${category && groupBy !== "category" ? Prisma.sql`AND pc.category = ${category}` : Prisma.sql``}
    ${
      rewardType && groupBy !== "rewardType"
        ? Prisma.sql`
        AND EXISTS (
          SELECT 1 FROM PartnerGroup pg
          WHERE
            pg.programId = p.id 
            AND pg.slug = ${DEFAULT_PARTNER_GROUP.slug}
            AND ${Prisma.join(
              rewardType.map((type) => rewardTypeMap[type]),
              " AND ",
            )}
        )`
        : Prisma.sql``
    }
    ${searchSql ? Prisma.sql`AND (p.name LIKE ${searchSql} OR p.slug LIKE ${searchSql} OR p.domain LIKE ${searchSql})` : Prisma.sql``}
  `;

  if (groupBy === "category") {
    const categories = (await prisma.$queryRaw`
      SELECT pc.category, COUNT(p.id) AS _count
      FROM ProgramCategory pc
      JOIN Program p ON p.id = pc.programId
      WHERE ${commonWhereSql}
      GROUP BY pc.category
      ORDER BY _count DESC
    `) as { category: string; _count: bigint }[];

    return NextResponse.json(
      categories.map(({ _count, ...rest }) => ({
        ...rest,
        _count: Number(_count),
      })),
    );
  } else if (groupBy === "rewardType") {
    const rewards = (await prisma.$queryRaw`
      SELECT
        COUNT(pg.clickRewardId) AS "click",
        COUNT(pg.leadRewardId) AS "lead",
        COUNT(pg.saleRewardId) AS "sale",
        COUNT(discountId) AS "discount"
      FROM PartnerGroup pg
      JOIN Program p ON p.id = pg.programId
      WHERE pg.slug = 'default' AND ${commonWhereSql}
    `) as { click: bigint; lead: bigint; sale: bigint; discount: bigint }[];

    return NextResponse.json(
      ["sale", "lead", "click", "discount"].map((k) => ({
        type: k,
        _count: Number(rewards[0][k]),
      })),
    );
  }

  const count = (await prisma.$queryRaw`
    SELECT COUNT(*) AS count FROM Program p
    WHERE ${commonWhereSql}
  `) as { count: bigint }[];

  return NextResponse.json(Number(count[0].count));
});
