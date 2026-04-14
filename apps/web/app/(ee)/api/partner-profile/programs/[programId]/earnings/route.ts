import { getEarningsForPartner } from "@/lib/api/partner-profile/get-earnings-for-partner";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerEarningsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings – get earnings for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId, partnerId, customerDataSharingEnabledAt } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: params.programId,
        include: {},
      });

    const parsedQuery = getPartnerEarningsQuerySchema.parse(searchParams);

    const earnings = await getEarningsForPartner({
      ...parsedQuery,
      programId,
      partnerId,
      customerDataSharingEnabledAt,
    });

    return NextResponse.json(earnings);
  },
);
