import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileProgramsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/count - count program enrollments for a given partnerId
export const GET = withPartnerProfile(
  async ({ partner, searchParams, partnerUser }) => {
    const { status } =
      partnerProfileProgramsCountQuerySchema.parse(searchParams);

    //    ...programScopeFilter(partnerUser.assignedPrograms),

    const count = await prisma.programEnrollment.count({
      where: {
        partnerId: partner.id,
        programId: { not: NETWORK_PROGRAM_ID },
        ...(status && { status }),
      },
    });

    return NextResponse.json(count);
  },
);
