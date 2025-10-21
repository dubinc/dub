import { withPartnerProfile } from "@/lib/auth/partner";
import { getNetworkProgramsCountQuerySchema } from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/network/programs/count - get the number of available programs in the network
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const _ = getNetworkProgramsCountQuerySchema.parse(searchParams);

  const count = await prisma.program.count({
    where: {
      marketplaceEnabledAt: {
        not: null,
      },
    },
  });

  return NextResponse.json(count);
});
