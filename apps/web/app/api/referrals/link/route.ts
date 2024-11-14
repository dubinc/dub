import { withAuth } from "@/lib/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/referrals/link - get the link for the given affiliate
export const GET = withAuth(async ({ link }) => {
  return NextResponse.json(link);
});
