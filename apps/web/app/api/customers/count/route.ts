import { withWorkspace } from "@/lib/auth";
import { getCustomersCountQuerySchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/customers/count
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const { email, externalId, search, country, groupBy } =
    getCustomersCountQuerySchema.parse(searchParams);

  const commonWhere: Prisma.CustomerWhereInput = {
    projectId: workspace.id,
    ...(email
      ? { email }
      : externalId
        ? { externalId }
        : {
            ...(search && {
              OR: [
                { email: { startsWith: search } },
                { externalId: { startsWith: search } },
                { name: { startsWith: search } },
              ],
            }),
            ...(country && {
              country,
            }),
          }),
  };

  // Get customer count by country
  if (groupBy === "country") {
    const data = await prisma.customer.groupBy({
      by: ["country"],
      where: commonWhere,
      _count: true,
      orderBy: {
        _count: {
          country: "desc",
        },
      },
    });

    return NextResponse.json(data);
  }

  // Get customer count by linkId
  if (groupBy === "linkId") {
    const data = await prisma.customer.groupBy({
      by: ["linkId"],
      where: { ...commonWhere, linkId: { not: null } },
      _count: true,
      orderBy: {
        _count: {
          linkId: "desc",
        },
      },
    });

    const links = await prisma.link.findMany({
      where: {
        id: { in: data.map(({ linkId }) => linkId!) },
      },
      select: {
        id: true,
        shortLink: true,
      },
    });

    return NextResponse.json(
      data.map(({ linkId }) => ({
        ...data.find(({ linkId: id }) => id === linkId)!,
        shortLink: links.find(({ id }) => id === linkId)?.shortLink,
      })),
    );
  }

  const count = await prisma.customer.count({
    where: commonWhere,
  });

  return NextResponse.json(count);
});
