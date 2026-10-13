import { getProgramEnrollmentsWhere } from "@/lib/api/partner-profile/get-program-enrollments-where";
import { withPartnerProfile } from "@/lib/auth/partner";
import { programEnrollmentEligibilityIncludes } from "@/lib/bounty/api/bounty-availability";
import { getBountiesForPartnerEnrollments } from "@/lib/bounty/api/get-bounties-for-partner";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { getPartnerLinksStatsByProgram } from "@/lib/partners/get-partner-links-stats-by-program";
import { prisma } from "@/lib/prisma";
import { PartnerProfileBountySchema } from "@/lib/zod/schemas/partner-profile";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/bounties – get available bounties for all active program enrollments
export const GET = withPartnerProfile(async ({ partner }) => {
  const [programEnrollments, linksStatsByProgram] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: getProgramEnrollmentsWhere({
        partnerId: partner.id,
        // archived partners can still submit bounties
        status: ACTIVE_ENROLLMENT_STATUSES,
      }),
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            defaultGroupId: true,
          },
        },
        ...programEnrollmentEligibilityIncludes,
      },
    }),
    // summed in the database, because a partner can have many links in each program
    getPartnerLinksStatsByProgram({ partnerId: partner.id }),
  ]);

  const bounties = await getBountiesForPartnerEnrollments({
    partnerId: partner.id,
    programEnrollments: programEnrollments.map((programEnrollment) => ({
      ...programEnrollment,
      partnerLinksStats:
        linksStatsByProgram.get(programEnrollment.programId) ??
        aggregatePartnerLinksStats([]),
    })),
  });

  const programsById = new Map(
    programEnrollments.map(({ program }) => [program.id, program]),
  );

  return NextResponse.json(
    z.array(PartnerProfileBountySchema).parse(
      bounties.map((bounty) => ({
        ...bounty,
        program: programsById.get(bounty.programId),
      })),
    ),
  );
});
