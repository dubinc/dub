import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { buildCustomerCountWhere } from "@/lib/customers/api/customer-count-where";
import { getCustomersCountQuerySchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/customers/count
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  let { programId, partnerId, groupBy, ...otherFilters } =
    getCustomersCountQuerySchema.parse(searchParams);

  if (programId || partnerId) {
    programId = getDefaultProgramIdOrThrow(workspace);
  }

  const commonWhere = buildCustomerCountWhere({
    ...otherFilters,
    programId,
    workspaceId: workspace.id,
  });

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
      take: 10000,
    });

    const links = await prisma.link.findMany({
      where: {
        id: { in: data.map(({ linkId }) => linkId!) },
      },
      select: {
        id: true,
        shortLink: true,
        url: true,
      },
    });

    const enrichedData = data
      .map((d) => {
        const link = links.find(({ id }) => id === d.linkId);
        if (!link) return null;
        return {
          ...d,
          shortLink: link?.shortLink,
          url: link?.url,
        };
      })
      .filter(Boolean);

    return NextResponse.json(enrichedData);
  }

  const count = await prisma.customer.count({
    where: commonWhere,
  });

  return NextResponse.json(count);
});
