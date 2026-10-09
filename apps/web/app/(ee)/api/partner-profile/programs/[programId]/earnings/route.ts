import { getEarningsForPartner } from "@/lib/api/partner-profile/get-earnings-for-partner";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  getPartnerEarningsQuerySchema,
  PartnerEarningsSchema,
} from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/programs/[programId]/earnings – get earnings for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId, partnerId } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {},
    });

    const parsedQuery = getPartnerEarningsQuerySchema.parse(searchParams);

    const earnings = await getEarningsForPartner({
      ...parsedQuery,
      programId,
      partnerId,
    });

    return NextResponse.json(z.array(PartnerEarningsSchema).parse(earnings));
  },
);
