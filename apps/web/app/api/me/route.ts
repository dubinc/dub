import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/me - get the current user
export const GET = withAuth(async ({ session }) => {
  return NextResponse.json(session.user);
});
