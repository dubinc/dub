import { withAuth } from "@/lib/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/referrals/program - get the program for the given affiliate
export const GET = withAuth(async ({ program }) => {
  return NextResponse.json(program);
});
