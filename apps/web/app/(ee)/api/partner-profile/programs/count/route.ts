import { getProgramEnrollmentsWhere } from "@/lib/api/partner-profile/get-program-enrollments-where";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { partnerProfileProgramsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/count - count program enrollments for a given partnerId
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { groupBy, status, search } =
    partnerProfileProgramsCountQuerySchema.parse(searchParams);

  const where = getProgramEnrollmentsWhere({
    partnerId: partner.id,
    status,
    search,
  });

  if (groupBy === "status") {
    const counts = await prisma.programEnrollment.groupBy({
      by: ["status"],
      where,
      _count: true,
    });

    // include every status, so that the page can hide the tabs with a count of 0
    return NextResponse.json(
      Object.values(ProgramEnrollmentStatus).map((status) => ({
        status,
        _count: counts.find((c) => c.status === status)?._count ?? 0,
      })),
    );
  }

  const count = await prisma.programEnrollment.count({
    where,
  });

  return NextResponse.json(count);
});
