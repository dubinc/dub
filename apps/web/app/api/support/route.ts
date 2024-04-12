import { withSession } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/support – file a support request
export const POST = withSession(async ({ req, session }) => {
  const { message } = await req.json();

  return NextResponse.json({
    success: true,
  });
});
