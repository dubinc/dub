import { withPartnerProfile } from "@/lib/auth/partner";
import { buildNetworkProgramCountWhereSql } from "@/lib/fetchers/get-network-program-counts";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { getNetworkProgramsCountQuerySchema } from "@/lib/zod/schemas/program-network";
import { NextResponse } from "next/server";

// GET /api/network/programs/count - get the number of available programs in the network
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { groupBy, category, rewardType, status, featured, search } =
    getNetworkProgramsCountQuerySchema.parse(searchParams);

  const commonWhereSql = buildNetworkProgramCountWhereSql({
    category: groupBy === "category" ? undefined : category,
    rewardType: groupBy === "rewardType" ? undefined : rewardType,
    status: groupBy === "status" ? undefined : status,
    partnerId: partner.id,
    featured,
    search,
  });

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
      WHERE pg.slug = ${DEFAULT_PARTNER_GROUP.slug} AND ${commonWhereSql}
    `) as { click: bigint; lead: bigint; sale: bigint; discount: bigint }[];

    return NextResponse.json(
      ["sale", "lead", "click", "discount"].map((k) => ({
        type: k,
        _count: Number(rewards[0][k]),
      })),
    );
  } else if (groupBy === "status") {
    const statuses = (await prisma.$queryRaw`
      SELECT pe.status, COUNT(p.id) AS _count
      FROM Program p
      LEFT JOIN ProgramEnrollment pe ON p.id = pe.programId AND pe.partnerId = ${partner.id}
      WHERE ${commonWhereSql}
      GROUP BY pe.status
      ORDER BY _count DESC
    `) as { status: string | null; _count: bigint }[];

    return NextResponse.json(
      statuses.map(({ _count, ...rest }) => ({
        ...rest,
        _count: Number(_count),
      })),
    );
  }

  const count = (await prisma.$queryRaw`
    SELECT COUNT(*) AS count FROM Program p
    WHERE ${commonWhereSql}
  `) as { count: bigint }[];

  return NextResponse.json(Number(count[0].count));
});
