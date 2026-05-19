import { withAdmin } from "@/lib/auth";
import { adminNetworkPartnerQuerySchema } from "@/lib/zod/schemas/admin";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/admin/partners/network
export const GET = withAdmin(async ({ searchParams }) => {
  const { networkStatus, country, search } = adminNetworkPartnerQuerySchema
    .pick({ networkStatus: true, country: true, search: true })
    .parse(searchParams);

  const partnersCount = await prisma.partner.count({
    where: {
      ...(networkStatus && { networkStatus }),
      ...(country && { country }),
      ...(search && search.startsWith("pn_")
        ? { id: search }
        : { email: search }),
    },
  });

  return NextResponse.json({
    count: partnersCount,
  });
});
