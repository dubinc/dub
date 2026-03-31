import { DubApiError } from "@/lib/api/errors";
import { getPartnerRewind } from "@/lib/api/partners/get-partner-rewind";
import { withPartnerProfile } from "@/lib/auth/partner";
import { NextResponse } from "next/server";

// GET /api/partner-profile/rewind - get a partner rewind
export const GET = withPartnerProfile(async ({ partner }) => {
  const partnerRewind = await getPartnerRewind({
    partnerId: partner.id,
  });

  if (!partnerRewind)
    throw new DubApiError({
      code: "not_found",
      message: "Partner rewind not found",
    });

  return NextResponse.json(partnerRewind);
});
