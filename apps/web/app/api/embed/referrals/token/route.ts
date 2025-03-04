import { withEmbedToken } from "@/lib/embed/auth";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/token - get the referrals embed token
export const GET = withEmbedToken(async ({ embedToken }) => {
  return NextResponse.json(embedToken);
});
