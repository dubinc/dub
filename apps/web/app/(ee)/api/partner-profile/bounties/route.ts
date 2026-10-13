import { getProgramEnrollmentsWhere } from "@/lib/api/partner-profile/get-program-enrollments-where";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getBountiesForPartnerEnrollments } from "@/lib/bounty/api/get-bounties-for-partner";
import { prisma } from "@/lib/prisma";
import { PartnerProfileBountySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/bounties – get available bounties for all approved program enrollments
export const GET = withPartnerProfile(async ({ partner }) => {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: getProgramEnrollmentsWhere({
      partnerId: partner.id,
      status: ["approved"],
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
      links: {
        select: {
          clicks: true,
          leads: true,
          conversions: true,
          sales: true,
          saleAmount: true,
        },
      },
      programPartnerTags: {
        select: {
          partnerTagId: true,
        },
      },
    },
  });

  const bounties = await getBountiesForPartnerEnrollments(programEnrollments);

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
