import { withPartner } from "@/lib/auth/partner";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId] - get a partner profile
export const GET = withPartner(async ({ partner }) => {
  return NextResponse.json(partner);
});
