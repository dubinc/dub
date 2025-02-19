import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { PartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings/timeseries - get timeseries chart for a partner's earnings
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { links } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  return NextResponse.json(links.map((link) => PartnerLinkSchema.parse(link)));
});
