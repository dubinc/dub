import { withPartnerProfile } from "@/lib/auth/partner";
import { NextResponse } from "next/server";

// GET /api/partner-profile - get a partner profile
export const GET = withPartnerProfile(async ({ partner }) => {
  return NextResponse.json(partner);
});
