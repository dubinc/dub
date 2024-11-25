import { withEmbedToken } from "@/lib/auth/embed-token";
import { NextResponse } from "next/server";

// GET /api/referrals/token - get the embed token for the given link
export const GET = withEmbedToken(async ({ linkToken }) => {
  return NextResponse.json(linkToken);
});
