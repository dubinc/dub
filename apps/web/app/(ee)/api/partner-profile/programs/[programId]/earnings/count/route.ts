import { getPartnerEarningsCount } from "@/lib/api/partner-profile/get-partner-earnings-count";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerEarningsCountQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings/count – get earnings count for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {},
    });

    const filters = getPartnerEarningsCountQuerySchema.parse(searchParams);

    const counts = await getPartnerEarningsCount({
      partnerId: partner.id,
      programId,
      filters,
    });

    return NextResponse.json(counts);
  },
);
