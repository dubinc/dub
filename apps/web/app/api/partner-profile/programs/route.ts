import { withPartnerProfile } from "@/lib/auth/partner";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs - get all enrolled programs for a given partnerId
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: partner.id,
    },
    include: {
      program: searchParams.includeRewardsDiscounts
        ? {
            include: {
              rewards: true,
              discounts: true,
            },
          }
        : true,
      links: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return NextResponse.json(
    z.array(ProgramEnrollmentSchema).parse(programEnrollments),
  );
});
