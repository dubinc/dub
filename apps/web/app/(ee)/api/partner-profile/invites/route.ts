import { withPartnerProfile } from "@/lib/auth/partner";
import { NextResponse } from "next/server";

// POST /api/partner-profile/invites - invite a user
export const POST = withPartnerProfile(async ({ partner }) => {
  return NextResponse.json(partner);
});
