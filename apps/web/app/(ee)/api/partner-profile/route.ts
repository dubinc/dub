import { withPartnerProfile } from "@/lib/auth/partner";
import { partnerSocialPlatformSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile - get a partner profile
export const GET = withPartnerProfile(async ({ partner, partnerUser }) => {
  const socialPlatforms = z
    .array(partnerSocialPlatformSchema)
    .parse(partner.platforms);

  return NextResponse.json({
    ...partnerUser,
    ...partner,
    platforms: socialPlatforms,
  });
});
