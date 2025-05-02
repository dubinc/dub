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
    const customers = await prisma.customer.groupBy({
      by: ["country"],
      where: {
        ...commonWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          country: "desc",
        },
      },
    });

    return NextResponse.json(customers);
  }

  const count = await prisma.customer.count({
    where: commonWhere,
  });

  return NextResponse.json(count);
});
