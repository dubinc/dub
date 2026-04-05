import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerProfileProgramsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/count - count program enrollments for a given partnerId
export const GET = withPartnerProfile(
  async ({ partner, searchParams, partnerUser: { assignedProgramIds } }) => {
    const { status } =
      partnerProfileProgramsCountQuerySchema.parse(searchParams);

    const count = await prisma.programEnrollment.count({
      where: {
        partnerId: partner.id,
        ...(status && { status }),
        ...(assignedProgramIds.length > 0 && {
          programId: {
            in: assignedProgramIds,
          },
        }),
      },
    });

    return NextResponse.json(count);
  },
);
