import { withPartner } from "@/lib/auth/partner";
import { NextResponse } from "next/server";

export const GET = withPartner(async ({ partner }) => {
  return NextResponse.json(partner);
});
