import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { programEnrollmentEligibilityIncludes } from "@/lib/bounty/api/bounty-availability";
import { getBountiesForPartner } from "@/lib/bounty/api/get-bounties-for-partner";
import { partnerLinkStatsSelect } from "@/lib/partners/aggregate-partner-links-stats";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/bounties – get available bounties for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
    include: {
      program: {
        select: {
          id: true,
          defaultGroupId: true,
        },
      },
      links: {
        select: partnerLinkStatsSelect,
      },
      ...programEnrollmentEligibilityIncludes,
    },
  });

  const bounties = await getBountiesForPartner(programEnrollment);

  return NextResponse.json(bounties);
});
