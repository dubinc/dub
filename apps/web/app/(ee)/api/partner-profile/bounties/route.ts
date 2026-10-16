import { getProgramEnrollmentsWhere } from "@/lib/api/partner-profile/get-program-enrollments-where";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { programEnrollmentEligibilityIncludes } from "@/lib/bounty/api/bounty-availability";
import { getBountiesForPartnerEnrollments } from "@/lib/bounty/api/get-bounties-for-partner";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { getPartnerLinksStatsByProgram } from "@/lib/partners/get-partner-links-stats-by-program";
import { hidePartnerTotalSaleAmount } from "@/lib/partners/hide-partner-revenue";
import { prisma } from "@/lib/prisma";
import {
  partnerProfileBountiesQuerySchema,
  PartnerProfileBountySchema,
} from "@/lib/zod/schemas/partner-profile";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const programEnrollmentInclude = {
  program: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      defaultGroupId: true,
    },
  },
  partnerGroup: {
    select: {
      revenueDataSharingDisabledAt: true,
    },
  },
  ...programEnrollmentEligibilityIncludes,
} satisfies Prisma.ProgramEnrollmentInclude;

// GET /api/partner-profile/bounties – get available bounties for all active program enrollments (or a single program)
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { programIdOrSlug } =
    partnerProfileBountiesQuerySchema.parse(searchParams);

  const { programEnrollments, linksStatsByProgram } =
    await getEnrollmentsWithLinksStats({
      partnerId: partner.id,
      programIdOrSlug,
    });

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

  const groupsByProgramId = new Map(
    programEnrollments.map(({ programId, partnerGroup }) => [
      programId,
      partnerGroup,
    ]),
  );

  return NextResponse.json(
    z.array(PartnerProfileBountySchema).parse(
      bounties.map((bounty) => ({
        ...bounty,
        program: programsById.get(bounty.programId),
        partner: hidePartnerTotalSaleAmount(
          bounty.partner,
          groupsByProgramId.get(bounty.programId),
        ),
      })),
    ),
  );
});

// the enrollments to load bounties for, with the partner's link stats in each program
async function getEnrollmentsWithLinksStats({
  partnerId,
  programIdOrSlug,
}: {
  partnerId: string;
  programIdOrSlug?: string;
}) {
  if (programIdOrSlug) {
    // one program accepts any enrollment status, as its program page does.
    // The partner sidebar locks the page for unapproved enrollments
    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId: programIdOrSlug,
      include: programEnrollmentInclude,
    });

    return {
      programEnrollments: [programEnrollment],
      // only this program's links, on the Link [programId, partnerId] index
      linksStatsByProgram: await getPartnerLinksStatsByProgram({
        partnerId,
        programId: programEnrollment.programId,
      }),
    };
  }

  const [programEnrollments, linksStatsByProgram] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: getProgramEnrollmentsWhere({
        partnerId,
        // archived partners can still submit bounties
        status: ACTIVE_ENROLLMENT_STATUSES,
      }),
      include: programEnrollmentInclude,
    }),
    // summed in the database, because a partner can have many links in each program
    getPartnerLinksStatsByProgram({ partnerId }),
  ]);

  return { programEnrollments, linksStatsByProgram };
}
