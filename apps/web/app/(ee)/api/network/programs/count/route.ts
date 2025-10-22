import { withPartnerProfile } from "@/lib/auth/partner";
import { getNetworkProgramsCountQuerySchema } from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/network/programs/count - get the number of available programs in the network
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { groupBy, search, category } =
    getNetworkProgramsCountQuerySchema.parse(searchParams);

  const commonWhere = {
    marketplaceEnabledAt: {
      not: null,
    },
    ...(search && {
      OR: [
        { name: { contains: search } },
        { slug: { contains: search } },
        { domain: { contains: search } },
      ],
    }),
    ...(category && {
      categories: {
        some: {
          category,
        },
      },
    }),
  };

  const searchSql = search ? Prisma.sql`CONCAT('%', ${search}, '%')` : null;
  const commonWhereSql = Prisma.sql`
    p.marketplaceEnabledAt IS NOT NULL
    ${category && groupBy !== "category" ? Prisma.sql`AND pc.category = ${category}` : Prisma.sql``}
    ${searchSql ? Prisma.sql`AND (p.name LIKE ${searchSql} OR p.slug LIKE ${searchSql} OR p.domain LIKE ${searchSql})` : Prisma.sql``}
  `;

  if (groupBy === "category") {
    const categories = (await prisma.$queryRaw`
      SELECT pc.category, COUNT(p.id) AS _count
      FROM ProgramCategory pc
      LEFT JOIN Program p ON p.id = pc.programId
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
  }

  const count = await prisma.program.count({
    where: {
      ...commonWhere,
    },
  });

  return NextResponse.json(count);
});
