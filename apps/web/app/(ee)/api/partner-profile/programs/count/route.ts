import { withPartnerProfile } from "@/lib/auth/partner";
import { programScopeFilter } from "@/lib/auth/partner-users/program-scope-filter";
import { partnerProfileProgramsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/count - count program enrollments for a given partnerId
export const GET = withPartnerProfile(
  async ({ partner, searchParams, partnerUser }) => {
    const { status } =
      partnerProfileProgramsCountQuerySchema.parse(searchParams);

    const count = await prisma.programEnrollment.count({
      where: {
        partnerId: partner.id,
        ...(status && { status }),
        ...programScopeFilter(partnerUser.assignedPrograms),
      },
    });

    return NextResponse.json(count);
  },
);
