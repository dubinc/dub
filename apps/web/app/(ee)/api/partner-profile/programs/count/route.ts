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

    const count = await prisma.programEnrollment.count({
      where: {
        partnerId: partner.id,
        ...(status && { status }),
        program: {
          id: {
            not: NETWORK_PROGRAM_ID,
            ...(partnerUser.assignedPrograms && {
              in: partnerUser.assignedPrograms.map((program) => program.id),
            }),
          },
          deactivatedAt: null,
        },
      },
    });

    return NextResponse.json(count);
  },
);
