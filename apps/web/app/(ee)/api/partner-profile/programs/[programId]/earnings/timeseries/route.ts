import { getPartnerEarningsTimeseries } from "@/lib/api/partner-profile/get-partner-earnings-timeseries";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings/timeseries - get timeseries chart for a partner's earnings
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {},
    });

    const filters = getPartnerEarningsTimeseriesSchema.parse(searchParams);

    const timeseries = await getPartnerEarningsTimeseries({
      partnerId: partner.id,
      programId,
      filters,
    });

    return NextResponse.json(timeseries);
  },
);
