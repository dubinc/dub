import { getPartnerEarningsTimeseries } from "@/lib/api/partner-profile/get-partner-earnings-timeseries";
import { withPartnerProfile } from "@/lib/auth/partner";
import { throwIfNoLinkAccess } from "@/lib/auth/partner-users/throw-if-no-access";
import { getPartnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings/timeseries - get timeseries chart for a partner's earnings
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams, partnerUser }) => {
    const filters = getPartnerEarningsTimeseriesSchema.parse(searchParams);

    throwIfNoLinkAccess({
      linkId: filters.linkId,
      partnerUser,
    });

    const timeseries = await getPartnerEarningsTimeseries({
      partnerId: partner.id,
      programId: params.programId,
      filters,
      assignedLinkIds: partnerUser.assignedLinkIds,
    });

    return NextResponse.json(timeseries);
  },
);
