import { withPartnerProfile } from "@/lib/auth/partner";
import { NextResponse } from "next/server";

// GET /api/partner-profile/users - list of users + invites
export const GET = withPartnerProfile(async ({ partner }) => {
  return NextResponse.json(partner);
});
