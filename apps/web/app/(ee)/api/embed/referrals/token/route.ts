import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/token - get the referrals embed token
export const GET = withReferralsEmbedToken(async ({ embedToken }) => {
  return NextResponse.json(embedToken);
});
