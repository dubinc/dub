import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  DiscoverablePartnerSchema,
  getDiscoverablePartnersQuerySchema,
} from "@/lib/zod/schemas/partner-discovery";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/network/partners - get all available partners in the network
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { page, pageSize } =
      getDiscoverablePartnersQuerySchema.parse(searchParams);

    const partners = (await prisma.$queryRaw`
      SELECT 
        p.*,
      FROM 
        Partner p
      WHERE 
        p.discoverableAt IS NOT NULL
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`) satisfies Array<any>;

    return NextResponse.json(
      z.array(DiscoverablePartnerSchema).parse(
        partners.map((partner) => ({
          ...partner,
        })),
      ),
    );
  },
  {
    requiredPlan: ["enterprise"],
  },
);
